"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

import prisma from "@/lib/prisma";

export type ActionState = {
  success: boolean;
  message: string;
};

const blogSchema = z.object({
  slug: z
    .string()
    .min(2, "Slug tối thiểu 2 ký tự")
    .transform((value) =>
      value
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-_]/g, "")
    ),
  title: z.string().min(3, "Tiêu đề tối thiểu 3 ký tự"),
  summary: z.string().trim().optional(),
  coverImage: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) =>
        !value ||
        value.startsWith("http://") ||
        value.startsWith("https://") ||
        value.startsWith("data:image/"),
      {
        message: "Ảnh phải là URL hợp lệ hoặc Data URI",
      }
    )
    .transform((value) => (value && value.length > 0 ? value : null)),
  bodyMd: z.string().min(10, "Nội dung tối thiểu 10 ký tự"),
  publishedAt: z.string().optional(),
});

export async function createBlogPost(prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const parsed = blogSchema.safeParse({
      slug: formData.get("slug") ?? "",
      title: formData.get("title") ?? "",
      summary: formData.get("summary") ?? "",
      coverImage: formData.get("coverImage") ?? "",
      bodyMd: formData.get("bodyMd") ?? "",
      publishedAt: formData.get("publishedAt") ?? "",
    });

    if (!parsed.success) {
      const message = parsed.error.issues.map((issue) => issue.message).join("; ");
      return { success: false, message };
    }

    const { slug, title, summary, coverImage, bodyMd, publishedAt } = parsed.data;

    await prisma.blogPost.upsert({
      where: { slug },
      update: {
        title,
        summary: summary ?? null,
        coverImage: coverImage ?? null,
        bodyMd,
        publishedAt: publishedAt ? new Date(`${publishedAt}T00:00:00Z`) : null,
      },
      create: {
        slug,
        title,
        summary: summary ?? null,
        coverImage: coverImage ?? null,
        bodyMd,
        publishedAt: publishedAt ? new Date(`${publishedAt}T00:00:00Z`) : null,
      },
    });

    revalidatePath("/admin");
    revalidatePath("/");
    revalidatePath("/blog");
    revalidatePath(`/blog/${slug}`);
    revalidateTag("blog:list", "default");
    revalidateTag("blog:latest", "default");
    revalidateTag(`blog:slug:${slug}`, "default");

    return { success: true, message: "Đã lưu bài viết thành công." };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, message: "Slug đã tồn tại, vui lòng chọn slug khác." };
    }
    console.error("[admin:createBlogPost]", error);
    return { success: false, message: "Không thể lưu bài viết. Vui lòng thử lại." };
  }
}

export async function deleteBlogPost(formData: FormData) {
  const slug = formData.get("slug");
  if (typeof slug !== "string" || slug.length === 0) {
    return;
  }

  try {
    await prisma.blogPost.delete({ where: { slug } });
  } catch (error) {
    console.error("[admin:deleteBlogPost]", error);
    return;
  }

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/blog");
  revalidateTag("blog:list", "default");
  revalidateTag("blog:latest", "default");
  revalidateTag(`blog:slug:${slug}`, "default");
}

const pricePointSchema = z.object({
  seriesId: z.string().min(1, "Chọn series"),
  region: z.string().min(1, "Chọn vùng"),
  date: z.string().min(1, "Chọn ngày"),
  value: z
    .string()
    .min(1, "Nhập giá trị")
    .refine((val) => !Number.isNaN(Number(val)), "Giá trị phải là số"),
  source: z.string().trim().optional(),
});

export async function createPricePoint(prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const parsed = pricePointSchema.safeParse({
      seriesId: formData.get("seriesId") ?? "",
      region: formData.get("region") ?? "",
      date: formData.get("date") ?? "",
      value: formData.get("value") ?? "",
      source: formData.get("source") ?? "",
    });

    if (!parsed.success) {
      const message = parsed.error.issues.map((issue) => issue.message).join("; ");
      return { success: false, message };
    }

    const { seriesId, region, date, value, source } = parsed.data;
    const pointDate = new Date(`${date}T00:00:00Z`);
    const normalizedRegion = region.trim().toUpperCase();

    await prisma.pricePoint.upsert({
      where: {
        seriesId_region_ts: {
          seriesId,
          region: normalizedRegion,
          ts: pointDate,
        },
      },
      update: {
        value: Number(value),
        source: source || null,
      },
      create: {
        seriesId,
        region: normalizedRegion,
        ts: pointDate,
        value: Number(value),
        source: source || null,
      },
    });

    revalidatePath("/admin");
    revalidatePath("/gia");
    revalidateTag("price:series", "default");
    revalidateTag("price:points", "default");

    return { success: true, message: "Đã cập nhật giá thành công." };
  } catch (error) {
    console.error("[admin:createPricePoint]", error);
    return { success: false, message: "Không thể cập nhật giá. Vui lòng thử lại." };
  }
}

export async function deletePricePoint(formData: FormData) {
  const seriesId = formData.get("seriesId");
  const region = formData.get("region");
  const ts = formData.get("ts");

  if (typeof seriesId !== "string" || typeof ts !== "string" || typeof region !== "string") {
    return;
  }

  const timestamp = new Date(ts);
  if (Number.isNaN(timestamp.getTime())) {
    return;
  }

  try {
    await prisma.pricePoint.delete({
      where: {
        seriesId_region_ts: {
          seriesId,
          region: region.trim().toUpperCase(),
          ts: timestamp,
        },
      },
    });
  } catch (error) {
    console.error("[admin:deletePricePoint]", error);
    return;
  }

  revalidatePath("/admin");
  revalidatePath("/gia");
  revalidateTag("price:series", "default");
  revalidateTag("price:points", "default");
}

const seriesSchema = z.object({
  product: z
    .string()
    .min(2, "Mã sản phẩm tối thiểu 2 ký tự")
    .max(40, "Mã sản phẩm tối đa 40 ký tự")
    .transform((value) => {
      const normalized = value
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .replace(/\s+/g, "_")
        .replace(/[^A-Z0-9_]/g, "");
      return normalized;
    })
    .refine((value) => value.length >= 2, "Mã sản phẩm sau khi chuẩn hoá cần tối thiểu 2 ký tự"),
  name: z.string().min(3, "Tên hiển thị tối thiểu 3 ký tự"),
  unit: z.string().min(1, "Đơn vị không được để trống"),
});

export async function createSeries(prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const parsed = seriesSchema.safeParse({
      product: formData.get("product") ?? "",
      name: formData.get("name") ?? "",
      unit: formData.get("unit") ?? "",
    });

    if (!parsed.success) {
      const message = parsed.error.issues.map((issue) => issue.message).join("; ");
      return { success: false, message };
    }

    const { product, name, unit } = parsed.data;
    const code = product;

    await prisma.priceSeries.upsert({
      where: { code },
      update: { name, unit },
      create: { code, name, unit },
    });

    revalidatePath("/admin");
    revalidatePath("/gia");

    return { success: true, message: "Đã lưu series thành công." };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, message: "Mã series đã tồn tại." };
    }
    console.error("[admin:createSeries]", error);
    return { success: false, message: "Không thể lưu series. Vui lòng thử lại." };
  }
}

export async function deleteSeries(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string" || id.length === 0) {
    return;
  }

  try {
    await prisma.priceSeries.delete({ where: { id } });
  } catch (error) {
    console.error("[admin:deleteSeries]", error);
    return;
  }

  revalidatePath("/admin");
  revalidatePath("/gia");
  revalidateTag("price:series", "default");
  revalidateTag("price:points", "default");
}

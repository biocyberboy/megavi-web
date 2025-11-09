"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";
import Papa from "papaparse";
import { z } from "zod";

import { REGION_KEYS, normalizeRegion } from "@/lib/seriesCode";
import prisma from "@/lib/prisma";
import { sanitizeRichText } from "@/lib/sanitize";

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
    const sanitizedBody = sanitizeRichText(bodyMd).trim();

    if (sanitizedBody.length === 0) {
      return { success: false, message: "Nội dung bài viết đang trống sau khi làm sạch." };
    }

    await prisma.blogPost.upsert({
      where: { slug },
      update: {
        title,
        summary: summary ?? null,
        coverImage: coverImage ?? null,
        bodyMd: sanitizedBody,
        publishedAt: publishedAt ? new Date(`${publishedAt}T00:00:00Z`) : null,
      },
      create: {
        slug,
        title,
        summary: summary ?? null,
        coverImage: coverImage ?? null,
        bodyMd: sanitizedBody,
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

export async function deleteBlogPost(prevState: ActionState | undefined, formData: FormData): Promise<ActionState> {
  const slug = formData.get("slug");
  if (typeof slug !== "string" || slug.length === 0) {
    return { success: false, message: "Thiếu thông tin bài viết" };
  }

  try {
    await prisma.blogPost.delete({ where: { slug } });
  } catch (error) {
    console.error("[admin:deleteBlogPost]", error);
    return { success: false, message: "Không thể xoá bài viết" };
  }

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/blog");
  revalidateTag("blog:list", "default");
  revalidateTag("blog:latest", "default");
  revalidateTag(`blog:slug:${slug}`, "default");

  return { success: true, message: "Đã xoá bài viết thành công" };
}

const pricePointSchema = z.object({
  seriesId: z.string().min(1, "Chọn series"),
  region: z.string().min(1, "Chọn vùng"),
  date: z.string().min(1, "Chọn ngày"),
  priceMode: z.enum(["SINGLE", "RANGE"]).default("SINGLE"),
  value: z.string().trim().optional(),
  valueMin: z.string().trim().optional(),
  valueMax: z.string().trim().optional(),
  company: z.string().trim().optional(),
  source: z.string().trim().optional(),
});

function parsePriceInput(raw: string | undefined, label: string) {
  if (!raw || raw.trim().length === 0) {
    throw new Error(label);
  }
  const parsed = Number(raw);
  if (Number.isNaN(parsed)) {
    throw new Error(label);
  }
  const normalized = Math.abs(parsed) > 0 && Math.abs(parsed) < 1000 ? parsed * 1000 : parsed;
  return normalized;
}

type ResolvedPrice = {
  value: number;
  valueMin: number;
  valueMax: number;
};

function resolvePriceInputs(
  priceMode: "SINGLE" | "RANGE",
  value?: string,
  valueMin?: string,
  valueMax?: string
): ResolvedPrice {
  if (priceMode === "RANGE") {
    if (!valueMin || !valueMax) {
      throw new Error("Khoảng giá cần cả giá thấp nhất và cao nhất.");
    }
    const minNumber = parsePriceInput(valueMin, "Giá thấp nhất không hợp lệ");
    const maxNumber = parsePriceInput(valueMax, "Giá cao nhất không hợp lệ");
    if (minNumber > maxNumber) {
      throw new Error("Giá thấp nhất phải nhỏ hơn hoặc bằng giá cao nhất.");
    }
    return {
      value: (minNumber + maxNumber) / 2,
      valueMin: minNumber,
      valueMax: maxNumber,
    };
  }

  const fallbackValue = value ?? valueMin ?? valueMax;
  const singleValue = parsePriceInput(fallbackValue, "Giá trị không hợp lệ");
  return {
    value: singleValue,
    valueMin: singleValue,
    valueMax: singleValue,
  };
}

async function upsertPriceRecord(params: {
  seriesId: string;
  region: string;
  date: Date;
  priceMode: "SINGLE" | "RANGE";
  value?: string;
  valueMin?: string;
  valueMax?: string;
  company?: string | null;
  source?: string | null;
}) {
  const { seriesId, region, date, priceMode, value, valueMin, valueMax, company, source } = params;

  const normalizedRegion = region.trim().toUpperCase();
  const normalizedCompany = company && company.length > 0 ? company.trim() : null;

  const resolved = resolvePriceInputs(priceMode, value, valueMin, valueMax);

  const existingRecord = await prisma.pricePoint.findFirst({
    where: {
      seriesId,
      region: normalizedRegion,
      company: normalizedCompany,
      ts: date,
    },
  });

  if (existingRecord) {
    await prisma.pricePoint.update({
      where: { id: existingRecord.id },
      data: {
        value: resolved.value,
        valueMin: resolved.valueMin,
        valueMax: resolved.valueMax,
        source: source || null,
      },
    });
  } else {
    await prisma.pricePoint.create({
      data: {
        seriesId,
        region: normalizedRegion,
        company: normalizedCompany,
        ts: date,
        value: resolved.value,
        valueMin: resolved.valueMin,
        valueMax: resolved.valueMax,
        source: source || null,
      },
    });
  }
}

export async function createPricePoint(prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const parsed = pricePointSchema.safeParse({
      seriesId: formData.get("seriesId") ?? "",
      region: formData.get("region") ?? "",
      date: formData.get("date") ?? "",
      priceMode: formData.get("priceMode") ?? "SINGLE",
      value: formData.get("value") ?? "",
      valueMin: formData.get("valueMin") ?? "",
      valueMax: formData.get("valueMax") ?? "",
      company: formData.get("company") ?? "",
      source: formData.get("source") ?? "",
    });

    if (!parsed.success) {
      const message = parsed.error.issues.map((issue) => issue.message).join("; ");
      return { success: false, message };
    }

    const { seriesId, region, date, value, valueMin, valueMax, priceMode, company, source } = parsed.data;
    const pointDate = new Date(`${date}T00:00:00Z`);
    const normalizedCompany = company && company.length > 0 ? company.trim() : null;

    try {
      await upsertPriceRecord({
        seriesId,
        region,
        date: pointDate,
        priceMode,
        value,
        valueMin,
        valueMax,
        company: normalizedCompany,
        source: source || null,
      });
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : "Không thể xử lý giá trị." };
    }

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

export async function createPricePointsBatch(prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const seriesId = (formData.get("seriesId") ?? "").toString();
    const date = (formData.get("date") ?? "").toString();
    const priceMode = (formData.get("priceMode") ?? "SINGLE") as "SINGLE" | "RANGE";
    const company = (formData.get("company") ?? "").toString() || undefined;
    const source = (formData.get("source") ?? "").toString() || undefined;

    if (!seriesId) {
      return { success: false, message: "Chọn series" };
    }
    if (!date) {
      return { success: false, message: "Chọn ngày" };
    }

    const pointDate = new Date(`${date}T00:00:00Z`);
    if (Number.isNaN(pointDate.getTime())) {
      return { success: false, message: "Ngày không hợp lệ" };
    }

    const normalizedCompany = company && company.length > 0 ? company.trim() : null;
    let inserted = 0;
    const errors: string[] = [];

    for (const region of ["MIEN_BAC", "MIEN_TRUNG", "MIEN_NAM"]) {
      const valueField = formData.get(`value-${region}`);
      const value = (valueField ?? "").toString().trim();
      const minField = formData.get(`valueMin-${region}`);
      const min = (minField ?? "").toString().trim();
      const maxField = formData.get(`valueMax-${region}`);
      const max = (maxField ?? "").toString().trim();
      const companyField = formData.get(`company-${region}`);
      const regionCompany = companyField ? companyField.toString().trim() : undefined;

      if (!value && !min && !max && !regionCompany) {
        continue;
      }

      try {
        await upsertPriceRecord({
          seriesId,
          region,
          date: pointDate,
          priceMode: priceMode === "RANGE" && min && max ? "RANGE" : "SINGLE",
          value,
          valueMin: min,
          valueMax: max,
          company: regionCompany ?? normalizedCompany,
          source: source || null,
        });
        inserted += 1;
      } catch (err) {
        errors.push(`${region}: ${err instanceof Error ? err.message : "không hợp lệ"}`);
      }
    }

    if (inserted === 0) {
      return { success: false, message: errors.length ? errors.join("; ") : "Chưa nhập giá cho vùng nào." };
    }

    revalidatePath("/admin");
    revalidatePath("/gia");
    revalidateTag("price:series", "default");
    revalidateTag("price:points", "default");

    const message = errors.length ? `Đã lưu ${inserted} vùng, lỗi: ${errors.join("; ")}` : `Đã lưu ${inserted} vùng.`;
    return { success: true, message };
  } catch (error) {
    console.error("[admin:createPricePointsBatch]", error);
    return { success: false, message: "Không thể cập nhật giá. Vui lòng thử lại." };
  }
}

export async function importPricePointsCsv(prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return { success: false, message: "Chọn tệp CSV hợp lệ." };
    }

    const text = await file.text();
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });

    if (parsed.errors.length > 0) {
      return { success: false, message: "Không thể đọc CSV. Vui lòng kiểm tra định dạng." };
    }

    const rows = parsed.data;
    if (rows.length === 0) {
      return { success: false, message: "Tệp CSV đang trống." };
    }

    const seriesCodes = await prisma.priceSeries.findMany({ select: { id: true, code: true } });
    const seriesMap = new Map(seriesCodes.map((item) => [item.code.toUpperCase(), item.id]));

    let successCount = 0;
    const errorMessages: string[] = [];

    for (const [index, row] of rows.entries()) {
      try {
        const seriesCode = row.seriesCode?.trim().toUpperCase();
        if (!seriesCode || !seriesMap.has(seriesCode)) {
          throw new Error("Thiếu hoặc sai seriesCode");
        }
        const seriesId = seriesMap.get(seriesCode)!;

        const date = row.date?.trim();
        if (!date) throw new Error("Thiếu ngày");
        const pointDate = new Date(`${date}T00:00:00Z`);
        if (Number.isNaN(pointDate.getTime())) throw new Error("Ngày không hợp lệ");

        const regionRaw = row.region?.trim();
        if (!regionRaw) throw new Error("Thiếu vùng");
        const normalizedRegion = String(normalizeRegion(regionRaw)).toUpperCase();
        if (!REGION_KEYS.includes(normalizedRegion)) {
          throw new Error(`Vùng không hợp lệ: ${regionRaw}`);
        }

        const company = row.company?.trim() || undefined;
        const source = row.source?.trim() || undefined;

        const trimmedValue = row.value?.trim() ?? "";
        const trimmedMin = row.valueMin?.trim() ?? "";
        const trimmedMax = row.valueMax?.trim() ?? "";

        const hasRange = trimmedMin.length > 0 && trimmedMax.length > 0;
        const priceMode = hasRange ? "RANGE" : "SINGLE";

        await upsertPriceRecord({
          seriesId,
          region: normalizedRegion,
          date: pointDate,
          priceMode,
          value: trimmedValue,
          valueMin: trimmedMin,
          valueMax: trimmedMax,
          company,
          source,
        });
        successCount += 1;
      } catch (err) {
        errorMessages.push(`Dòng ${index + 2}: ${err instanceof Error ? err.message : "không hợp lệ"}`);
      }
    }

    if (successCount === 0) {
      return { success: false, message: errorMessages.join("; ") || "Không thể nhập dữ liệu." };
    }

    revalidatePath("/admin");
    revalidatePath("/gia");
    revalidateTag("price:series", "default");
    revalidateTag("price:points", "default");

    const message =
      errorMessages.length > 0
        ? `Đã nhập ${successCount} dòng. Lỗi: ${errorMessages.slice(0, 5).join("; ")}`
        : `Đã nhập ${successCount} dòng thành công.`;
    return { success: true, message };
  } catch (error) {
    console.error("[admin:importPricePointsCsv]", error);
    return { success: false, message: "Không thể nhập CSV. Vui lòng thử lại." };
  }
}
export async function deletePricePoint(prevState: ActionState | undefined, formData: FormData): Promise<ActionState> {
  const seriesId = formData.get("seriesId");
  const region = formData.get("region");
  const company = formData.get("company");
  const ts = formData.get("ts");

  if (typeof seriesId !== "string" || typeof ts !== "string" || typeof region !== "string") {
    return { success: false, message: "Thiếu thông tin giá" };
  }

  const timestamp = new Date(ts);
  if (Number.isNaN(timestamp.getTime())) {
    return { success: false, message: "Ngày giờ không hợp lệ" };
  }

  const normalizedCompany = typeof company === "string" && company.length > 0 ? company.trim() : null;

  try {
    // Find the record first
    const record = await prisma.pricePoint.findFirst({
      where: {
        seriesId,
        region: region.trim().toUpperCase(),
        company: normalizedCompany,
        ts: timestamp,
      },
    });

    if (!record) {
      console.error("[admin:deletePricePoint] Record not found");
      return { success: false, message: "Không tìm thấy dữ liệu giá" };
    }

    // Delete by id
    await prisma.pricePoint.delete({
      where: { id: record.id },
    });
  } catch (error) {
    console.error("[admin:deletePricePoint]", error);
    return { success: false, message: "Không thể xoá dữ liệu giá" };
  }

  revalidatePath("/admin");
  revalidatePath("/gia");
  revalidateTag("price:series", "default");
  revalidateTag("price:points", "default");

  return { success: true, message: "Đã xoá dữ liệu giá thành công" };
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

export async function deleteSeries(prevState: ActionState | undefined, formData: FormData): Promise<ActionState> {
  const id = formData.get("id");
  if (typeof id !== "string" || id.length === 0) {
    return { success: false, message: "Thiếu thông tin series" };
  }

  try {
    await prisma.priceSeries.delete({ where: { id } });
  } catch (error) {
    console.error("[admin:deleteSeries]", error);
    return { success: false, message: "Không thể xoá series" };
  }

  revalidatePath("/admin");
  revalidatePath("/gia");
  revalidateTag("price:series", "default");
  revalidateTag("price:points", "default");

  return { success: true, message: "Đã xoá series thành công" };
}

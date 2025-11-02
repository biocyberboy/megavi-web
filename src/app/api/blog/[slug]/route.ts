import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;

  const includeDrafts = new URL(request.url).searchParams.get("drafts") === "true";

  try {
    const post = await prisma.blogPost.findFirst({
      where: {
        slug: {
          equals: slug,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        coverImage: true,
        bodyMd: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (!includeDrafts && !post.publishedAt) {
      return NextResponse.json({ error: "Post not published" }, { status: 404 });
    }

    return NextResponse.json(
      {
        ...post,
        summary: post.summary ?? "",
        coverImage: post.coverImage ?? "",
        bodyMd: post.bodyMd,
        publishedAt: post.publishedAt?.toISOString() ?? null,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
      },
      {
        headers: {
          "Cache-Control": includeDrafts
            ? "no-store"
            : "s-maxage=300, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    console.error("[api/blog/[slug]]", error);
    return NextResponse.json({ error: "Failed to load blog post" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";

import { getPublishedPosts } from "@/lib/data/blog";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const includeDrafts = url.searchParams.get("drafts") === "true";
  const takeParam = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(takeParam) && takeParam > 0 ? Math.min(takeParam, 100) : 50;

  try {
    const posts = includeDrafts
      ? await prisma.blogPost.findMany({
          orderBy: { publishedAt: "desc" },
          take: limit,
          select: {
            id: true,
            slug: true,
            title: true,
            summary: true,
            coverImage: true,
            publishedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        })
      : (await getPublishedPosts()).slice(0, limit);

    return NextResponse.json(
      posts.map((post) => ({
        ...post,
        summary: post.summary ?? "",
        coverImage: post.coverImage ?? "",
        publishedAt: post.publishedAt?.toISOString() ?? null,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
      })),
      {
        headers: {
          "Cache-Control": includeDrafts
            ? "no-store"
            : "s-maxage=300, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    console.error("[api/blog]", error);
    return NextResponse.json({ error: "Failed to load blog posts" }, { status: 500 });
  }
}

import { unstable_cache } from "next/cache";

import prisma from "@/lib/prisma";

const DEFAULT_REVALIDATE_SECONDS = 120;

export const getLatestPublishedPosts = unstable_cache(
  async () =>
    prisma.blogPost.findMany({
      where: { publishedAt: { not: null } },
      orderBy: { publishedAt: "desc" },
      take: 3,
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        coverImage: true,
        publishedAt: true,
      },
    }),
  ["blog:latest"],
  {
    tags: ["blog:latest", "blog:list"],
    revalidate: DEFAULT_REVALIDATE_SECONDS,
  }
);

export const getPublishedPosts = unstable_cache(
  async () =>
    prisma.blogPost.findMany({
      where: { publishedAt: { not: null } },
      orderBy: { publishedAt: "desc" },
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
    }),
  ["blog:published"],
  {
    tags: ["blog:list"],
    revalidate: DEFAULT_REVALIDATE_SECONDS,
  }
);

export async function getBlogPostBySlug(slug: string) {
  const cachedFetcher = unstable_cache(
    async () =>
      prisma.blogPost.findFirst({
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
      }),
    ["blog:slug", slug],
    {
      tags: [`blog:slug:${slug}`, "blog:list"],
      revalidate: DEFAULT_REVALIDATE_SECONDS,
    }
  );

  return cachedFetcher();
}

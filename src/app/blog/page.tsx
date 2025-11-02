import type { Metadata } from "next";
import Link from "next/link";

import prisma from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Bản tin Gia cầm – MEGAVI Official",
};

const CARD_BACKGROUNDS = [
  "linear-gradient(135deg, rgba(179,13,13,0.8), rgba(11,11,11,0.95))",
  "linear-gradient(135deg, rgba(247,201,72,0.7), rgba(11,11,11,0.95))",
  "linear-gradient(135deg, rgba(11,11,11,0.85), rgba(179,13,13,0.65))",
  "linear-gradient(135deg, rgba(11,11,11,0.9), rgba(246,247,249,0.35))",
];

export default async function BlogPage() {
  let posts: {
    id: string;
    slug: string;
    title: string;
    summary: string | null;
    coverImage: string | null;
    publishedAt: Date | null;
  }[] = [];

  try {
    posts = await prisma.blogPost.findMany({
      where: { publishedAt: { not: null } },
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        coverImage: true,
        publishedAt: true,
      },
    });
  } catch (error) {
    console.error("[blog] Failed to load posts", error);
  }

  return (
    <main className="theme-surface px-4 md:px-6 pb-16 md:pb-20 pt-24 md:pt-32">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col items-center text-center px-2">
          <p className="text-[10px] md:text-xs tracking-[0.25em] md:tracking-[0.3em] text-[#f7c948]/80">BẢN TIN MEGAVI</p>
          <h1 className="blog-hero-title mt-3 md:mt-4 text-2xl md:text-4xl lg:text-6xl font-serif text-[#f6f7f9]">
            Nhịp đập thị trường gia cầm
          </h1>
          <p className="blog-hero-subtext mt-3 md:mt-4 max-w-2xl text-xs md:text-sm lg:text-base text-gray-300">
            Cập nhật nhanh diễn biến giá, chiến lược phân phối và tín hiệu nguồn cung từ đội ngũ phân
            tích MEGAVI.
          </p>
        </div>

        <section className="mt-10 md:mt-16 grid gap-6 md:gap-10 md:grid-cols-2">
          {posts.map((post, index) => {
            const formattedDate = post.publishedAt
              ? new Date(post.publishedAt).toLocaleDateString("vi-VN", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })
              : "Chưa xuất bản";

            return (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group theme-panel blog-feature-card relative overflow-hidden rounded-2xl md:rounded-3xl border shadow-[0_40px_120px_rgba(0,0,0,0.45)] transition-transform hover:-translate-y-1"
              >
                <div className="relative aspect-[3/2] overflow-hidden">
                  {post.coverImage ? (
                    <div className="absolute inset-0 transition duration-500 group-hover:scale-105">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={post.coverImage}
                        alt={post.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div
                      className="absolute inset-0 transition duration-500 group-hover:scale-105 group-hover:opacity-80"
                      style={{ backgroundImage: CARD_BACKGROUNDS[index % CARD_BACKGROUNDS.length] }}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent dark:opacity-100 opacity-50" />
                  <div className="absolute bottom-4 md:bottom-6 left-4 md:left-6 right-4 md:right-6">
                    <span className="blog-card-date text-[10px] md:text-xs uppercase tracking-[0.2em] md:tracking-[0.25em] text-[#f7c948]/70">
                      {formattedDate}
                    </span>
                    <h2 className="mt-2 md:mt-3 text-lg md:text-2xl font-serif text-white transition-colors group-hover:text-[#f7c948]">
                      {post.title}
                    </h2>
                    {post.summary ? (
                      <p className="blog-card-summary mt-2 md:mt-3 text-xs md:text-sm text-gray-300 line-clamp-2">{post.summary}</p>
                    ) : null}
                  </div>
                </div>
                <div className="blog-card-footer theme-panel-soft px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm text-gray-300">
                  <span className="inline-flex items-center gap-1.5 md:gap-2 font-medium text-[#f7c948]">
                    Đọc phân tích
                    <svg
                      aria-hidden
                      viewBox="0 0 24 24"
                      className="h-3.5 md:h-4 w-3.5 md:w-4 transition-transform group-hover:translate-x-1"
                    >
                      <path
                        d="M5 12h14M13 6l6 6-6 6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </div>
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}

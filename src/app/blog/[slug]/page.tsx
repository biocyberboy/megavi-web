import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { renderMarkdown } from "@/lib/markdown";
import { getBlogPostBySlug, getPublishedPosts } from "@/lib/data/blog";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  if (process.env.SKIP_PRERENDER === "true" || process.env.VERCEL === "1") {
    return [];
  }
  try {
    const posts = await getPublishedPosts();

    return posts.map((post) => ({ slug: post.slug }));
  } catch (error) {
    console.error("[blog] generateStaticParams fallback", error);
    return [];
  }
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const post = await getBlogPostBySlug(slug);

    if (!post || !post.publishedAt) {
      return { title: "Bản tin Gia cầm – MEGAVI Official" };
    }

    return {
      title: `${post.title} – MEGAVI Official`,
      description: post.summary ?? undefined,
    };
  } catch (error) {
    console.error("[blog] generateMetadata fallback", error);
    return { title: "Bản tin Gia cầm – MEGAVI Official" };
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  let post: {
    id: string;
    slug: string;
    title: string;
    summary: string | null;
    coverImage: string | null;
    bodyMd: string;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  } | null = null;

  try {
    post = await getBlogPostBySlug(slug);
  } catch (error) {
    console.error("[blog slug] Failed to load post", error);
  }

  if (!post || !post.publishedAt) {
    notFound();
  }

  const formattedDate = new Date(post.publishedAt).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const content = renderMarkdown(post.bodyMd);

  return (
    <main className="theme-surface pb-16 md:pb-24">
      <article className="mx-auto max-w-3xl px-4 md:px-6 pt-24 md:pt-28">
        <div className="theme-panel relative overflow-hidden rounded-2xl md:rounded-3xl border">
          {post.coverImage ? (
            <div className="absolute inset-0">
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
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, rgba(179,13,13,0.75), rgba(11,11,11,0.9))",
              }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/70 to-black" />
          <div className="relative z-10 px-5 md:px-8 py-12 md:py-16">
            <p className="text-[10px] md:text-xs uppercase tracking-[0.2em] md:tracking-[0.25em] text-[#f7c948]/80">{formattedDate}</p>
            <h1 className="mt-3 md:mt-4 text-2xl md:text-4xl lg:text-5xl font-serif text-[#f6f7f9]">{post.title}</h1>
            {post.summary ? (
              <p className="mt-3 md:mt-4 max-w-2xl text-xs md:text-sm lg:text-base text-gray-200">{post.summary}</p>
            ) : null}
          </div>
        </div>

        <div className="theme-panel mt-8 md:mt-16 space-y-4 md:space-y-6 rounded-2xl md:rounded-3xl border p-5 md:p-8 shadow-[0_40px_120px_rgba(0,0,0,0.45)]">
          {content}
        </div>
      </article>
    </main>
  );
}

import Link from "next/link";

import { getLatestPublishedPosts } from "@/lib/data/blog";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CARD_BACKGROUNDS = [
  "linear-gradient(135deg, rgba(179,13,13,0.85), rgba(11,11,11,0.92))",
  "linear-gradient(135deg, rgba(247,201,72,0.75), rgba(11,11,11,0.9))",
  "linear-gradient(135deg, rgba(11,11,11,0.88), rgba(179,13,13,0.6))",
];

export default async function Home() {
  let latestPosts: {
    id: string;
    slug: string;
    title: string;
    summary: string | null;
    coverImage: string | null;
    publishedAt: Date | null;
  }[] = [];

  try {
    latestPosts = await getLatestPublishedPosts();
  } catch (error) {
    console.error("[home] Failed to load posts", error);
  }

  return (
    <main className="theme-surface min-h-screen">
      <section id="hero" className="relative flex min-h-[60vh] md:min-h-[70vh] items-center justify-center overflow-hidden">
        {/* Video Background */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
          poster="/images/hero_farm_sunrise.jpg"
        >
          <source src="/videos/farm-hero.mp4" type="video/mp4" />
        </video>

        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
        <div className="relative z-10 px-4 md:px-6 text-center">
          <p className="tracking-[0.2em] md:tracking-[0.25em] text-[10px] md:text-xs lg:text-sm text-[#f7c948]/80">
            BẢN TIN & DỮ LIỆU THỊ TRƯỜNG GIA CẦM
          </p>
          <h1 className="mt-3 md:mt-4 text-3xl md:text-5xl lg:text-7xl font-serif text-[#f6f7f9]">MEGAVI Insight</h1>
          <p className="mt-3 md:mt-4 text-gray-200 text-sm md:text-base lg:text-lg px-4">
            Cập nhật dữ liệu giá gia cầm và biến động thị trường theo thời gian thực.
          </p>
          <div className="mt-6 md:mt-8 flex flex-col md:flex-row items-center justify-center gap-3 md:gap-4 px-4">
            <a
              href="/gia"
              className="w-full md:w-auto inline-block bg-white text-black px-6 py-2.5 md:py-3 rounded-full text-sm md:text-base font-medium transition hover:bg-gray-100"
            >
              Xem bảng giá hôm nay
            </a>
            <Link
              href="/blog"
              className="w-full md:w-auto theme-outline-button hero-outline-button inline-block rounded-full px-6 py-2.5 md:py-3 text-sm font-medium"
            >
              Đọc bản tin mới nhất
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto flex max-w-5xl flex-col gap-8 md:gap-10 px-4 md:px-6 py-12 md:py-20">
        <div className="flex flex-col items-center text-center px-2">
          <p className="text-[10px] md:text-xs tracking-[0.25em] md:tracking-[0.3em] text-[#f7c948]/70">BẢN TIN MỚI</p>
          <h2 className="mt-2 md:mt-3 text-2xl md:text-3xl lg:text-4xl font-serif text-[#f6f7f9]">
            Đừng bỏ lỡ nhịp đập thị trường
          </h2>
          <p className="mt-3 md:mt-4 max-w-2xl text-xs md:text-sm lg:text-base text-gray-300">
            Những phân tích chuyên sâu từ đội ngũ MEGAVI về giá cả, nguồn cung và chiến lược phân phối.
          </p>
        </div>

        <div className="grid gap-6 md:gap-8 md:grid-cols-3">
          {latestPosts.length === 0 ? (
            <div className="theme-panel col-span-full rounded-2xl md:rounded-3xl border p-6 md:p-8 text-center text-xs md:text-sm text-gray-400">
              Chưa có bài viết nào được xuất bản. Quay lại sau bạn nhé!
            </div>
          ) : (
            latestPosts.map((post, index) => {
              const formattedDate = post.publishedAt
                ? new Date(post.publishedAt).toLocaleDateString("vi-VN", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })
                : "Chưa xuất bản";

              return (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group theme-panel relative flex h-full flex-col overflow-hidden rounded-2xl md:rounded-3xl border shadow-[0_30px_80px_rgba(0,0,0,0.4)] transition hover:-translate-y-1"
                >
                  <div className="relative h-36 md:h-40 w-full flex-shrink-0 overflow-hidden">
                    {post.coverImage ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={post.coverImage}
                          alt={post.title}
                          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/40" />
                      </>
                    ) : (
                      <div
                        className="absolute inset-0 transition duration-500 group-hover:opacity-80"
                        style={{ backgroundImage: CARD_BACKGROUNDS[index % CARD_BACKGROUNDS.length] }}
                      />
                    )}
                  </div>
                  <div className="flex h-full flex-col justify-between p-4 md:p-6">
                    <div>
                      <span className="text-[10px] md:text-xs uppercase tracking-[0.2em] md:tracking-[0.25em] text-[#f7c948]/70">
                        {formattedDate}
                      </span>
                      <h3 className="mt-2 md:mt-3 text-base md:text-xl font-serif transition-colors group-hover:text-[#f7c948]">
                        {post.title}
                      </h3>
                    </div>
                    <span className="mt-4 md:mt-6 inline-flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-medium text-[#f7c948]">
                      Đọc ngay
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
            })
          )}
        </div>

        <div className="text-center px-4">
          <Link
            href="/blog"
            className="theme-outline-button inline-flex items-center gap-1.5 md:gap-2 rounded-full px-5 md:px-6 py-2.5 md:py-3 text-xs md:text-sm font-medium"
          >
            Khám phá toàn bộ bản tin
            <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 md:h-4 w-3.5 md:w-4">
              <path
                d="M5 12h14M13 6l6 6-6 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>
      </section>
    </main>
  );
}

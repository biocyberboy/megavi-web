import type { Metadata } from "next";

import prisma from "@/lib/prisma";
import { REGION_KEYS, deriveProductFromCode, normalizeRegion } from "@/lib/seriesCode";

import BlogForm from "./BlogForm";
import ClientGate from "./ClientGate";
import PriceForm from "./PriceForm";
import SeriesForm from "./SeriesForm";
import { deleteBlogPost, deletePricePoint, deleteSeries } from "./actions";

export const metadata: Metadata = {
  title: "Admin – MEGAVI Official",
};

function formatNumber(value: number, unit: string) {
  const formatter = new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2,
  });
  return `${formatter.format(value)} ${unit}`;
}

const REGION_LABELS: Record<string, string> = {
  MIEN_BAC: "Miền Bắc",
  MIEN_TRUNG: "Miền Trung",
  MIEN_NAM: "Miền Nam",
  ALL: "Tất cả vùng",
};

type PostSummary = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
};

type SeriesSummary = {
  id: string;
  code: string;
  name: string;
  unit: string;
};

type PricePointSummary = {
  id: string;
  seriesId: string;
  ts: Date;
  value: number;
  source: string | null;
  region: string;
  series: {
    id: string;
    name: string;
    code: string;
    unit: string;
  } | null;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPage() {
  let posts: PostSummary[] = [];
  let series: SeriesSummary[] = [];
  let pricePoints: PricePointSummary[] = [];

  try {
    const [postData, seriesData, pricePointData] = await Promise.all([
      prisma.blogPost.findMany({
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          slug: true,
          title: true,
          summary: true,
          publishedAt: true,
          updatedAt: true,
        },
      }),
      prisma.priceSeries.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          code: true,
          name: true,
          unit: true,
        },
      }),
      prisma.pricePoint.findMany({
        orderBy: { ts: "desc" },
        include: {
          series: {
            select: {
              id: true,
              name: true,
              code: true,
              unit: true,
            },
          },
        },
      }),
    ]);

    posts = postData;
    series = seriesData;
    pricePoints = pricePointData.map((point) => ({
      ...point,
      value: point.value.toNumber ? point.value.toNumber() : Number(point.value),
    }));
  } catch (error) {
    console.error("[admin] Failed to load data", error);
  }

  const seriesRegionMap = new Map<string, Set<string>>();
  for (const point of pricePoints) {
    const set = seriesRegionMap.get(point.seriesId) ?? new Set<string>();
    set.add(normalizeRegion(point.region));
    seriesRegionMap.set(point.seriesId, set);
  }

  const seriesOptions = series.map((item) => ({
    id: item.id,
    name: item.name,
    code: item.code,
    unit: item.unit,
    product: deriveProductFromCode(item.code),
    regions: Array.from(seriesRegionMap.get(item.id) ?? new Set<string>(REGION_KEYS)),
  }));

  const stats = {
    totalPosts: posts.length,
    publishedPosts: posts.filter((post) => post.publishedAt).length,
    seriesCount: seriesOptions.length,
    pricePointCount: pricePoints.length,
  };

  const latestPricePoints = pricePoints.slice(0, 25);

  return (
    <ClientGate>
      <main className="theme-surface min-h-screen px-6 pb-24 pt-28">
        <div className="mx-auto flex max-w-6xl flex-col gap-12">
          <header className="theme-panel rounded-3xl border p-8 shadow-[0_40px_120px_rgba(0,0,0,0.45)]">
            <p className="text-xs uppercase tracking-[0.35em] text-[#f7c948]/70">Bảng điều khiển</p>
            <h1 className="mt-3 text-3xl font-serif text-[#f6f7f9] md:text-4xl">MEGAVI Admin</h1>
            <p className="mt-3 text-sm text-gray-300 md:text-base">
              Trang quản trị dùng để cập nhật bài viết, quản lý series và ghi nhận giá.
            </p>
          </header>

          <section className="grid gap-6 md:grid-cols-2">
            <article className="theme-panel rounded-3xl border p-6 shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
              <p className="text-xs uppercase tracking-[0.3em] text-[#f7c948]/70">Tổng quan</p>
              <h2 className="mt-2 text-lg font-serif text-[#f6f7f9]">Sức khoẻ dữ liệu</h2>
              <dl className="mt-6 grid gap-4 text-sm text-gray-300">
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <dt>Bài viết đã xuất bản</dt>
                  <dd className="text-lg font-semibold text-[#f7c948]">{stats.publishedPosts}</dd>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <dt>Tổng bài viết</dt>
                  <dd className="text-lg font-semibold text-[#f7c948]">{stats.totalPosts}</dd>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <dt>Series đang theo dõi</dt>
                  <dd className="text-lg font-semibold text-[#f7c948]">{stats.seriesCount}</dd>
                </div>
                <div className="flex items-center justify_between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <dt>Dòng giá được ghi nhận</dt>
                  <dd className="text-lg font-semibold text-[#f7c948]">{stats.pricePointCount}</dd>
                </div>
              </dl>
            </article>

            <article className="theme-panel rounded-3xl border p-6 shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
              <p className="text-xs uppercase tracking-[0.3em] text-[#f7c948]/70">Danh mục</p>
              <h2 className="mt-2 text-lg font-serif text-[#f6f7f9]">Series hiện có</h2>
              <ul className="mt-4 max-h-[220px] space-y-3 overflow-y-auto text-sm text-gray-300">
                {seriesOptions.length === 0 ? (
                  <li>Chưa có series nào.</li>
                ) : (
                  seriesOptions.map((item) => (
                    <li key={item.id} className="flex items-center justify_between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <div>
                        <p className="font-medium text-white">{item.name}</p>
                        <p className="text-xs uppercase tracking-[0.2em] text-[#f7c948]/80">{item.product}</p>
                      </div>
                      <form action={deleteSeries}>
                        <input type="hidden" name="id" value={item.id} />
                        <button
                          type="submit"
                          className="rounded-full border border-white/20 px-3 py-1 text-xs text-gray-300 transition hover:border-red-400 hover:text-red-400"
                        >
                          Xoá
                        </button>
                      </form>
                    </li>
                  ))
                )}
              </ul>
            </article>
          </section>

          <section className="space-y-4">
            <details className="theme-panel overflow-hidden rounded-3xl border background" open>
              <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-sm font-semibold text-[#f6f7f9] transition hover:text-[#f7c948]">
                Quản lý bài viết
                <span className="text-xs text-gray-400">Tạo mới hoặc cập nhật nội dung</span>
              </summary>
              <div className="border-t border-white/5 p-6 space-y-6">
                <BlogForm />
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <h3 className="text-sm font-semibold text-[#f6f7f9]">Danh sách bài viết</h3>
                  <table className="mt-3 w-full border-separate border-spacing-y-3 text-left text-sm">
                    <thead className="text-xs uppercase tracking-wider text-[#f7c948]/80">
                      <tr>
                        <th className="px-3">Tiêu đề</th>
                        <th className="px-3">Trạng thái</th>
                        <th className="px-3">Cập nhật</th>
                        <th className="px-3 text-right">Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {posts.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-6 text-center text-gray-400">
                            Chưa có bài viết.
                          </td>
                        </tr>
                      ) : (
                        posts.slice(0, 12).map((post) => {
                          const status = post.publishedAt ? "Đã xuất bản" : "Draft";
                          const statusColor = post.publishedAt ? "text-emerald-400" : "text-yellow-400";
                          return (
                            <tr key={post.id} className="rounded-2xl bg-black/60">
                              <td className="px-3 py-3">
                                <div className="font-medium text-white">{post.title}</div>
                                <div className="text-xs text-gray-400">/{post.slug}</div>
                              </td>
                              <td className={`px-3 py-3 text-xs font-semibold ${statusColor}`}>{status}</td>
                              <td className="px-3 py-3 text-xs text-gray-400">
                                {post.updatedAt.toLocaleDateString("vi-VN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </td>
                              <td className="px-3 py-3 text-right">
                                <form action={deleteBlogPost}>
                                  <input type="hidden" name="slug" value={post.slug} />
                                  <button
                                    type="submit"
                                    className="rounded-full border border-white/20 px-3 py-1 text-xs text-gray-300 transition hover:border-red-400 hover:text-red-400"
                                  >
                                    Xoá
                                  </button>
                                </form>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </details>

            <details className="theme-panel overflow-hidden rounded-3xl border" open>
              <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-sm font-semibold text-[#f6f7f9] transition hover:text-[#f7c948]">
                Quản lý series & giá
                <span className="text-xs text-gray-400">Thêm series mới và ghi nhận dữ liệu giá</span>
              </summary>
              <div className="border-t border-white/5 p-6 space-y-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  <SeriesForm />
                  <PriceForm series={seriesOptions} />
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <h3 className="text-sm font-semibold text-[#f6f7f9]">Các dòng giá gần nhất</h3>
                  <div className="max-h-[320px] overflow-y-auto">
                    <table className="w-full border-separate border-spacing-y-2 text-left text-xs md:text-sm">
                      <thead className="text-[10px] uppercase tracking-[0.2em] text-[#f7c948]/80">
                        <tr>
                          <th className="px-3 py-2">Series</th>
                          <th className="px-3 py-2">Vùng</th>
                          <th className="px-3 py-2">Ngày</th>
                          <th className="px-3 py-2 text-right">Giá trị</th>
                          <th className="px-3 py-2 text-right">Xoá</th>
                        </tr>
                      </thead>
                      <tbody>
                        {latestPricePoints.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-3 py-6 text-center text-gray-400">
                              Chưa có dữ liệu giá.
                            </td>
                          </tr>
                        ) : (
                          latestPricePoints.map((point) => (
                            <tr key={`${point.seriesId}-${point.ts.toISOString()}`} className="rounded-2xl bg-black/50">
                              <td className="px-3 py-2">
                                <div className="font-medium text-white">{point.series?.name ?? "—"}</div>
                                <div className="text-[10px] text-gray-400">
                                  {point.series ? deriveProductFromCode(point.series.code) : "—"}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-[10px] text-gray-400">
                                {REGION_LABELS[normalizeRegion(point.region)] ?? point.region}
                              </td>
                              <td className="px-3 py-2 text-[10px] text-gray-400">
                                {point.ts.toLocaleDateString("vi-VN")}
                              </td>
                              <td className="px-3 py-2 text-right text-sm font-semibold text-white">
                                {formatNumber(point.value, point.series?.unit ?? "")}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <form action={deletePricePoint}>
                                  <input type="hidden" name="seriesId" value={point.seriesId} />
                                  <input type="hidden" name="region" value={point.region} />
                                  <input type="hidden" name="ts" value={point.ts.toISOString()} />
                                  <button
                                    type="submit"
                                    className="rounded-full border border-white/20 px-3 py-1 text-[10px] text-gray-300 transition hover:border-red-400 hover:text-red-400"
                                  >
                                    Xoá
                                  </button>
                                </form>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </details>
          </section>
        </div>
      </main>
    </ClientGate>
  );
}

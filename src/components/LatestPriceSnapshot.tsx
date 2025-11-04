"use client";

import { toPng } from "html-to-image";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import type { LatestPriceSnapshot } from "@/lib/data/price";

type SnapshotEntry = LatestPriceSnapshot;

function formatCurrency(value: number, unit: string) {
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value)} ${unit}`;
}

function formatDate(ts: string) {
  const date = new Date(ts);
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const REGION_LABELS: Record<string, string> = {
  MIEN_BAC: "Miền Bắc",
  MIEN_TRUNG: "Miền Trung",
  MIEN_NAM: "Miền Nam",
};

const REGION_ORDER = ["MIEN_BAC", "MIEN_TRUNG", "MIEN_NAM"];

function sortEntries(entries: SnapshotEntry[]) {
  return entries.slice().sort((a, b) => {
    if (a.seriesName !== b.seriesName) {
      return a.seriesName.localeCompare(b.seriesName, "vi");
    }
    if (a.region !== b.region) {
      return REGION_ORDER.indexOf(a.region) - REGION_ORDER.indexOf(b.region);
    }
    return (a.company ?? "").localeCompare(b.company ?? "", "vi");
  });
}

export default function LatestPriceSnapshotPanel({ initialData }: { initialData: SnapshotEntry[] }) {
  const [data, setData] = useState<SnapshotEntry[]>(initialData);
  const [loading, setLoading] = useState(initialData.length === 0);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let ignore = false;
    setLoading(initialData.length === 0);

    async function fetchData() {
      try {
        const response = await fetch("/api/price/latest", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load latest prices");
        }
        const payload: { data: SnapshotEntry[] } = await response.json();
        if (!ignore) {
          setData(payload.data);
          setError(null);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Unexpected error");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    if (initialData.length === 0) {
      fetchData();
    }

    return () => {
      ignore = true;
    };
  }, [initialData]);

  const grouped = useMemo(() => {
    const sorted = sortEntries(data);
    const map = new Map<string, SnapshotEntry[]>();
    sorted.forEach((entry) => {
      const list = map.get(entry.seriesId) ?? [];
      list.push(entry);
      map.set(entry.seriesId, list);
    });
    return Array.from(map.entries()).map(([seriesId, entries]) => ({
      seriesId,
      seriesName: entries[0]?.seriesName ?? "",
      seriesCode: entries[0]?.seriesCode ?? "",
      unit: entries[0]?.unit ?? "đ/kg",
      entries,
    }));
  }, [data]);

  const handleCapture = async () => {
    if (!containerRef.current) return;

    try {
      const dataUrl = await toPng(containerRef.current, {
        cacheBust: true,
        backgroundColor: "#090909",
      });
      const link = document.createElement("a");
      link.download = `bang-gia-moi-nhat-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to capture snapshot", err);
      alert("Không thể chụp ảnh bảng giá. Vui lòng thử lại.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-serif text-[#f6f7f9]">Bảng giá mới nhất</h2>
          <p className="text-xs text-gray-400">Mỗi dòng là lần ghi nhận giá gần nhất cho từng sản phẩm - vùng - công ty.</p>
        </div>
        <button
          type="button"
          onClick={handleCapture}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs text-gray-200 transition hover:border-[#f7c948] hover:text-[#f7c948]"
        >
          <span className="relative flex h-5 w-6 items-center justify-center text-current">
            <span className="absolute inset-0 rounded-[6px] border border-current"></span>
            <span className="absolute -top-1 left-1/2 h-[6px] w-3 -translate-x-1/2 rounded-sm border border-current bg-transparent"></span>
            <span className="relative h-[10px] w-[10px] rounded-full border border-current"></span>
            <span className="absolute right-[6px] top-1 h-[4px] w-[4px] rounded-full border border-current bg-transparent"></span>
          </span>
          Chụp ảnh
        </button>
      </div>

      <div
        ref={containerRef}
        className="latest-snapshot-panel theme-panel rounded-3xl border p-4 md:p-6 shadow-[0_40px_120px_rgba(0,0,0,0.5)]"
      >
        {loading ? (
          <p className="text-sm text-gray-400">Đang tải dữ liệu mới nhất...</p>
        ) : error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : grouped.length === 0 ? (
          <p className="text-sm text-gray-400">Chưa có dữ liệu.</p>
        ) : (
          <div className="space-y-6 text-sm">
            {grouped.map((group) => {
              const regionGroups = new Map<string, SnapshotEntry[]>();
              group.entries.forEach((entry) => {
                const list = regionGroups.get(entry.region) ?? [];
                list.push(entry);
                regionGroups.set(entry.region, list);
              });
              return (
                <div key={group.seriesId} className="rounded-2xl border border-white/5 bg-black/40 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2 text-gray-300">
                    <div className="flex flex-col">
                      <span className="text-base font-semibold text-[#f6f7f9]">{group.seriesName}</span>
                    </div>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-400">
                      Đơn vị: {group.unit}
                    </span>
                  </div>

                  <div className="mt-3 overflow-hidden rounded-xl">
                    <table className="latest-snapshot-table min-w-full divide-y divide-white/10">
                      <thead className="text-[11px] uppercase tracking-wide text-[#f7c948]/80">
                        <tr>
                          <th className="px-3 py-2 text-left">Công ty</th>
                          <th className="px-3 py-2 text-left">Giá</th>
                          <th className="px-3 py-2 text-left">Ngày</th>
                        </tr>
                      </thead>
                      <tbody className="text-gray-200">
                        {REGION_ORDER.filter((region) => regionGroups.has(region)).map((region) => {
                          const entries = regionGroups.get(region)!;
                          return (
                            <Fragment key={`${group.seriesId}-${region}`}>
                              <tr className="region-header">
                                <td colSpan={3} className="px-3 py-2 text-xs font-semibold tracking-[0.3em] uppercase">
                                  {REGION_LABELS[region] ?? region}
                                </td>
                              </tr>
                              {entries.map((entry) => (
                                <tr key={`${entry.seriesId}-${region}-${entry.company ?? "null"}`}>
                                  <td className="px-3 py-2 text-xs">{entry.company ?? "—"}</td>
                                  <td className="px-3 py-2 text-xs font-semibold text-current">
                                    {formatCurrency(entry.value, group.unit)}
                                  </td>
                                  <td className="px-3 py-2 text-xs text-gray-400">{formatDate(entry.recordedAt)}</td>
                                </tr>
                              ))}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

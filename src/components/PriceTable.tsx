"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { formatCompactPriceRange } from "@/lib/priceFormat";

type PricePoint = {
  ts: string;
  value: number;
  valueMin?: number | null;
  valueMax?: number | null;
  source: string | null;
  region?: string;
  company?: string | null;
};

type Props = {
  series: { code: string; name: string; unit: string } | null;
  rangeLabel: string;
  data: PricePoint[];
  loading: boolean;
  error: string | null;
  regionLabel?: string;
  regionValue?: string;
};

const PAGE_SIZE = 10;

const REGION_LABELS: Record<string, string> = {
  MIEN_BAC: "Miền Bắc",
  MIEN_TRUNG: "Miền Trung",
  MIEN_NAM: "Miền Nam",
  ALL: "Tổng hợp",
};

export default function PriceTable({ series, rangeLabel, data, loading, error, regionLabel, regionValue }: Props) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [series?.code, rangeLabel, data.length]);

  const sortedData = useMemo(
    () => [...data].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()),
    [data]
  );

  const totalPages = Math.max(1, Math.ceil(sortedData.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageData = sortedData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const goToPage = (nextPage: number) => {
    setPage(Math.min(Math.max(nextPage, 1), totalPages));
  };

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>;
  }

  if (loading) {
    return <p className="text-sm text-gray-400">Đang tải dữ liệu...</p>;
  }

  if (!series) {
    return <p className="text-sm text-gray-400">Chưa chọn series.</p>;
  }

  const headerRegionLabel = (() => {
    if (!regionValue) {
      return regionLabel ?? "—";
    }
    const key = regionValue.toUpperCase();
    if (key === "ALL") {
      return REGION_LABELS.ALL;
    }
    return REGION_LABELS[key] ?? regionLabel ?? key;
  })();

  const formatRegionLabel = (pointRegion?: string) => {
    if (pointRegion) {
      const key = pointRegion.toUpperCase();
      return REGION_LABELS[key] ?? pointRegion;
    }
    return headerRegionLabel;
  };

  return (
    <div className="overflow-hidden rounded-2xl md:rounded-3xl border theme-panel">
      <div className="flex flex-wrap items-center justify-between gap-2 md:gap-3 theme-panel-soft px-3 md:px-6 py-3 md:py-4">
        <div>
          <p className="text-[10px] md:text-xs uppercase tracking-[0.25em] md:tracking-[0.3em] text-[#f7c948]/70">Bảng dữ liệu</p>
          <h3 className="text-base md:text-lg font-serif text-[#f6f7f9]">{series.name}</h3>
          <p className="text-[10px] md:text-xs text-gray-400">
            Vùng: {headerRegionLabel} · Khung {rangeLabel} · Đơn vị: đ/kg
          </p>
        </div>
        <Link
          href={`/api/price/${series.code}?range=${rangeLabel.replace(/[^0-9]/g, "")}&region=${regionValue ?? "ALL"}`}
          className="theme-outline-button rounded-full px-3 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs"
          prefetch={false}
        >
          Tải JSON
        </Link>
      </div>
      <div className="overflow-x-auto bg-black/40">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/5 text-[10px] md:text-xs uppercase tracking-wider text-[#f7c948]/80">
            <tr>
              <th className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap">Vùng miền</th>
              <th className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap">Ngày</th>
              <th className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap">Giá</th>
              <th className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap">Công ty</th>
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-2 md:px-4 py-4 md:py-6 text-center text-xs md:text-sm text-gray-400">
                  Chưa có dữ liệu cho khung thời gian này.
                </td>
              </tr>
            ) : (
              pageData.map((point, idx) => {
                const rowKey = point.region
                  ? `${point.ts}-${point.region}-${point.company ?? "null"}-${point.value}-${point.valueMin ?? ""}-${point.valueMax ?? ""}`
                  : `${point.ts}-${idx}`;
                return (
                <tr key={rowKey} className="border-b border-white/5 last:border-none">
                  <td className="px-2 md:px-4 py-2 md:py-3 text-[10px] md:text-xs text-gray-400 whitespace-nowrap">{formatRegionLabel(point.region)}</td>
                  <td className="px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-200 whitespace-nowrap font-medium">
                    {new Date(point.ts).toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium text-white whitespace-nowrap">
                    {formatCompactPriceRange(point.value, point.valueMin, point.valueMax)}
                  </td>
                  <td className="px-2 md:px-4 py-2 md:py-3 text-[10px] md:text-xs text-gray-400">{point.company || "—"}</td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-2 md:gap-4 px-3 md:px-4 py-2 md:py-3 text-[10px] md:text-xs text-gray-400">
        <span>
          Trang {currentPage} / {totalPages}
        </span>
        <div className="flex items-center gap-1.5 md:gap-2">
          <button
            type="button"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="rounded-full border border-white/20 px-2 md:px-3 py-1 text-[10px] md:text-xs transition hover:border-[#f7c948] hover:text-[#f7c948] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Trước
          </button>
          <button
            type="button"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="rounded-full border border-white/20 px-2 md:px-3 py-1 text-[10px] md:text-xs transition hover:border-[#f7c948] hover:text-[#f7c948] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Sau
          </button>
        </div>
      </div>
    </div>
  );
}

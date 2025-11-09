"use client";

import { toPng } from "html-to-image";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import type { LatestPriceSnapshot } from "@/lib/data/price";
import { formatCompactPriceRange } from "@/lib/priceFormat";
import { useTheme } from "@/components/ThemeProvider";

type SnapshotEntry = LatestPriceSnapshot;

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

type SnapshotTemplate = {
  id: string;
  name: string;
  description: string;
  panelClass: string | { dark: string; light: string };
  cardClass: string | { dark: string; light: string };
  headerTextClass: string | { dark: string; light: string };
  badgeClass: string | { dark: string; light: string };
  tableHeaderClass: string | { dark: string; light: string };
  regionHeaderClass: string | { dark: string; light: string };
  valueTextClass: string | { dark: string; light: string };
  companyTextClass: string | { dark: string; light: string };
  dateTextClass: string | { dark: string; light: string };
  captureBackground: string;
  previewClass: string;
};

const SNAPSHOT_FOOTER_LINKS = [
  { label: "Website", value: "megavi.space" },
  { label: "Facebook", value: "fb.com/megaviinsight" },
  { label: "TikTok", value: "tiktok.com/@megaviinsight" },
];

const SNAPSHOT_TEMPLATES: SnapshotTemplate[] = [
  {
    id: "classic",
    name: "Classic",
    description: "Đen vàng nổi bật",
    panelClass: "bg-[#090909] border-white/10 text-gray-100",
    cardClass: "bg-black/40 border-white/10",
    headerTextClass: "text-gray-300 border-white/5",
    badgeClass: "text-gray-400 border-white/10",
    tableHeaderClass: "text-[#f7c948]/80",
    regionHeaderClass: "text-[#f7c948]",
    valueTextClass: "text-white",
    companyTextClass: "text-gray-300",
    dateTextClass: "text-gray-400",
    captureBackground: "#090909",
    previewClass: "bg-gradient-to-r from-[#f59e0b] to-[#fbbf24]",
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Xanh đậm dịu mắt",
    panelClass: {
      dark: "bg-gradient-to-br from-[#0f172a] via-[#131c31] to-[#1f2937] border-[#1e293b] text-slate-100",
      light: "bg-gradient-to-br from-[#edf4ff] via-[#f8fbff] to-[#ffffff] border-[#c7d2fe]/70 text-slate-800",
    },
    cardClass: {
      dark: "bg-white/5 border-[#1f4374]/40 backdrop-blur",
      light: "bg-white border-[#bfdbfe] shadow-[0_10px_30px_rgba(15,23,42,0.08)]",
    },
    headerTextClass: {
      dark: "text-[#dbeafe] border-[#1f4374]/30",
      light: "text-[#1e3a8a] border-[#bfdbfe]",
    },
    badgeClass: {
      dark: "text-[#bfdbfe] border-[#1f4374]/50",
      light: "text-[#1d4ed8] border-[#93c5fd] bg-[#eff6ff]",
    },
    tableHeaderClass: {
      dark: "text-[#93c5fd]/90",
      light: "text-[#1e3a8a]",
    },
    regionHeaderClass: {
      dark: "text-[#bfdbfe]",
      light: "text-[#1d4ed8]",
    },
    valueTextClass: {
      dark: "text-white",
      light: "text-[#0f172a]",
    },
    companyTextClass: {
      dark: "text-[#cbd5f5]",
      light: "text-[#475569]",
    },
    dateTextClass: {
      dark: "text-[#9ca3af]",
      light: "text-[#64748b]",
    },
    captureBackground: "#edf4ff",
    previewClass: "bg-gradient-to-r from-[#38bdf8] to-[#4f46e5]",
  },
  {
    id: "ember",
    name: "Ember",
    description: "Tông nâu cam ấm",
    panelClass: {
      dark: "bg-gradient-to-br from-[#1b1205] via-[#2b1606] to-[#3b2009] border-[#8c4c0f]/40 text-amber-50",
      light: "bg-gradient-to-br from-[#fff7ed] via-[#fff1e0] to-white border-[#fdba74]/60 text-[#7c2d12]",
    },
    cardClass: {
      dark: "bg-[#2b1606]/80 border-[#f59e0b]/40",
      light: "bg-[#fff7ed]/90 border-[#fdba74]/70",
    },
    headerTextClass: {
      dark: "text-[#fcd34d] border-[#a16207]/30",
      light: "text-[#9a3412] border-[#fdba74]",
    },
    badgeClass: {
      dark: "text-[#fde68a] border-[#f59e0b]/60",
      light: "text-[#b45309] border-[#fdba74]",
    },
    tableHeaderClass: {
      dark: "text-[#facc15]",
      light: "text-[#b45309]",
    },
    regionHeaderClass: {
      dark: "text-[#fde68a]",
      light: "text-[#ea580c]",
    },
    valueTextClass: {
      dark: "text-[#fef3c7]",
      light: "text-[#7c2d12]",
    },
    companyTextClass: {
      dark: "text-[#fcd34d]",
      light: "text-[#9a3412]",
    },
    dateTextClass: {
      dark: "text-[#fbbf24]",
      light: "text-[#b45309]",
    },
    captureBackground: "#2b1606",
    previewClass: "bg-gradient-to-r from-[#f97316] via-[#ea580c] to-[#b45309]",
  },
];

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
  const [showSeriesSelector, setShowSeriesSelector] = useState(false);
  const [selectedSeriesIds, setSelectedSeriesIds] = useState<Set<string>>(new Set());
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(SNAPSHOT_TEMPLATES[0]?.id ?? "classic");
  const [footerVisible, setFooterVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { theme } = useTheme();

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

  const handleOpenSelector = () => {
    // Select all series by default when opening
    if (selectedSeriesIds.size === 0) {
      setSelectedSeriesIds(new Set(grouped.map((g) => g.seriesId)));
    }
    setShowSeriesSelector(true);
  };

  const handleToggleSeries = (seriesId: string) => {
    setSelectedSeriesIds((prev) => {
      const next = new Set(prev);
      if (next.has(seriesId)) {
        next.delete(seriesId);
      } else {
        next.add(seriesId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedSeriesIds(new Set(grouped.map((g) => g.seriesId)));
  };

  const handleDeselectAll = () => {
    setSelectedSeriesIds(new Set());
  };

  const selectedTemplate = useMemo(() => {
    const base = SNAPSHOT_TEMPLATES.find((tpl) => tpl.id === selectedTemplateId) ?? SNAPSHOT_TEMPLATES[0];
    const resolve = (value: SnapshotTemplate["panelClass"]) =>
      typeof value === "string" ? value : value[theme === "light" ? "light" : "dark"];

    return {
      ...base,
      panelClass: resolve(base.panelClass),
      cardClass: resolve(base.cardClass),
      headerTextClass: resolve(base.headerTextClass),
      badgeClass: resolve(base.badgeClass),
      tableHeaderClass: resolve(base.tableHeaderClass),
      regionHeaderClass: resolve(base.regionHeaderClass),
      valueTextClass: resolve(base.valueTextClass),
      companyTextClass: resolve(base.companyTextClass),
      dateTextClass: resolve(base.dateTextClass),
    };
  }, [selectedTemplateId, theme]);

  const handleCapture = async () => {
    if (!containerRef.current) return;

    try {
      setFooterVisible(true);
      await new Promise((resolve) => setTimeout(resolve, 50));
      const dataUrl = await toPng(containerRef.current, {
        cacheBust: true,
        backgroundColor: selectedTemplate.captureBackground,
        pixelRatio: 2, // Higher quality
      });
      const link = document.createElement("a");
      link.download = `bang-gia-moi-nhat-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
      setShowSeriesSelector(false);
    } catch (err) {
      console.error("Failed to capture snapshot", err);
      alert("Không thể chụp ảnh bảng giá. Vui lòng thử lại.");
    } finally {
      setFooterVisible(false);
    }
  };

  const filteredGrouped = useMemo(() => {
    if (selectedSeriesIds.size === 0) return grouped;
    return grouped.filter((g) => selectedSeriesIds.has(g.seriesId));
  }, [grouped, selectedSeriesIds]);

  return (
    <>
      {/* Series Selector Modal */}
      {showSeriesSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="theme-panel w-full max-w-md rounded-3xl border p-6 shadow-2xl">
            <div className="mb-4">
              <h3 className="text-lg font-serif text-[#f6f7f9]">Chọn series để chụp ảnh</h3>
              <p className="mt-1 text-xs text-gray-400">
                Chọn các series bạn muốn xuất hiện trong ảnh
              </p>
            </div>

            <div className="mb-4 flex gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="flex-1 rounded-full border border-white/15 px-3 py-2 text-xs text-gray-300 transition hover:border-[#f7c948] hover:text-[#f7c948]"
              >
                Chọn tất cả
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="flex-1 rounded-full border border-white/15 px-3 py-2 text-xs text-gray-300 transition hover:border-red-400 hover:text-red-400"
              >
                Bỏ chọn tất cả
              </button>
            </div>

            <div className="max-h-[300px] space-y-2 overflow-y-auto">
              {grouped.map((group) => (
                <label
                  key={group.seriesId}
                  className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-[#f7c948]/30 hover:bg-white/10"
                >
                  <input
                    type="checkbox"
                    checked={selectedSeriesIds.has(group.seriesId)}
                    onChange={() => handleToggleSeries(group.seriesId)}
                    className="h-4 w-4 rounded border-white/20 bg-white/10 text-[#f7c948] focus:ring-[#f7c948] focus:ring-offset-0"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#f6f7f9]">{group.seriesName}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowSeriesSelector(false)}
                className="flex-1 rounded-full border border-white/15 px-4 py-2 text-sm text-gray-300 transition hover:border-gray-400 hover:text-gray-100"
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={handleCapture}
                disabled={selectedSeriesIds.size === 0}
                className="flex-1 rounded-full bg-[#f7c948] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#f7c948]/80 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Chụp ảnh ({selectedSeriesIds.size})
              </button>
            </div>
          </div>
        </div>
      )}

    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-serif text-[#f6f7f9]">Bảng giá mới nhất</h2>
          <p className="text-xs text-gray-400">Mỗi dòng là lần ghi nhận giá gần nhất cho từng sản phẩm - vùng - công ty.</p>
        </div>
        <div className="flex flex-col items-start gap-2 text-[10px] uppercase tracking-[0.3em] text-gray-400 md:items-end">
          <div className="flex flex-col gap-2">
            <span className="text-[10px]">Template</span>
            <div className="flex flex-wrap gap-1">
              {SNAPSHOT_TEMPLATES.map((template) => {
                const isActive = template.id === selectedTemplateId;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(template.id)}
                    aria-pressed={isActive}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold transition ${
                      isActive
                        ? "border-transparent bg-[#f7c948] text-black shadow-[0_4px_16px_rgba(247,201,72,0.45)]"
                        : "border-white/20 text-gray-300 hover:border-[#f7c948]/60 hover:text-white"
                    }`}
                  >
                    <span className={`h-3 w-6 rounded-full ${template.previewClass}`} aria-hidden />
                    {template.name}
                  </button>
                );
              })}
            </div>
            <span className="text-[10px] tracking-normal text-gray-400">
              {selectedTemplate.description}
            </span>
          </div>
          <button
            type="button"
            onClick={handleOpenSelector}
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
      </div>

      <div
        ref={containerRef}
        className={`latest-snapshot-panel rounded-3xl border p-4 md:p-6 shadow-[0_40px_120px_rgba(0,0,0,0.5)] ${selectedTemplate.panelClass}`}
      >
        {loading ? (
          <p className="text-sm text-gray-400">Đang tải dữ liệu mới nhất...</p>
        ) : error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : grouped.length === 0 ? (
          <p className="text-sm text-gray-400">Chưa có dữ liệu.</p>
        ) : (
          <div className="space-y-6 text-sm">
            {filteredGrouped.map((group) => {
              const regionGroups = new Map<string, SnapshotEntry[]>();
              group.entries.forEach((entry) => {
                const list = regionGroups.get(entry.region) ?? [];
                list.push(entry);
                regionGroups.set(entry.region, list);
              });
              return (
                <div key={group.seriesId} className={`rounded-2xl border px-4 py-3 ${selectedTemplate.cardClass}`}>
                  <div className={`flex flex-wrap items-center justify-between gap-2 border-b pb-2 ${selectedTemplate.headerTextClass}`}>
                    <div className="flex flex-col">
                      <span className="text-base font-semibold">{group.seriesName}</span>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs ${selectedTemplate.badgeClass}`}>
                      Đơn vị: đ/kg
                    </span>
                  </div>

                  <div className="mt-3 overflow-hidden rounded-xl">
                    <table className="latest-snapshot-table min-w-full divide-y divide-white/10">
                      <thead className={`text-[11px] uppercase tracking-wide ${selectedTemplate.tableHeaderClass}`}>
                        <tr>
                          <th className="px-3 py-2 text-left">Công ty</th>
                          <th className="px-3 py-2 text-left">Giá</th>
                          <th className="px-3 py-2 text-left">Ngày</th>
                        </tr>
                      </thead>
                      <tbody>
                        {REGION_ORDER.filter((region) => regionGroups.has(region)).map((region) => {
                          const entries = regionGroups.get(region)!;
                          return (
                            <Fragment key={`${group.seriesId}-${region}`}>
                              <tr className={`region-header ${selectedTemplate.regionHeaderClass}`}>
                                <td colSpan={3} className="px-3 py-2 text-xs font-semibold tracking-[0.3em] uppercase">
                                  {REGION_LABELS[region] ?? region}
                                </td>
                              </tr>
                              {entries.map((entry) => (
                                <tr key={`${entry.seriesId}-${region}-${entry.company ?? "null"}`}>
                                  <td className={`px-3 py-2 text-xs ${selectedTemplate.companyTextClass}`}>{entry.company ?? "—"}</td>
                                  <td className={`px-3 py-2 text-xs font-semibold whitespace-nowrap ${selectedTemplate.valueTextClass}`}>
                                    {formatCompactPriceRange(entry.value, entry.valueMin, entry.valueMax)}
                                  </td>
                                  <td className={`px-3 py-2 text-xs ${selectedTemplate.dateTextClass}`}>{formatDate(entry.recordedAt)}</td>
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
        {footerVisible && (
          <div
            className={`mt-4 rounded-2xl border px-3 py-1.5 ${
              theme === "light" ? "border-slate-200 bg-white text-slate-900" : "border-white/15 bg-white/5 text-gray-200"
            }`}
          >
            <div className="flex w-full items-center justify-between gap-1 text-[5px] sm:text-[6px] md:text-[8px] uppercase tracking-[0.2em] leading-tight font-semibold">
              {SNAPSHOT_FOOTER_LINKS.map((item) => (
                <span key={item.label} className="whitespace-nowrap">
                  {item.value}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}

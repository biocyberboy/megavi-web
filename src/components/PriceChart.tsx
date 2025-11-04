'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipProps } from "recharts";

import PriceTable from "@/components/PriceTable";

import { useTheme } from "@/components/ThemeProvider";
const ACCENT_COLOR = "#f7c948";

const REGION_LABELS: Record<string, string> = {
  MIEN_BAC: "Miền Bắc",
  MIEN_TRUNG: "Miền Trung",
  MIEN_NAM: "Miền Nam",
  ALL: "Tất cả vùng",
};

const REGION_COLORS: Record<string, string> = {
  MIEN_BAC: ACCENT_COLOR,
  MIEN_TRUNG: "#B06A55",
  MIEN_NAM: "#4E7C9A",
};

const REGION_ORDER: string[] = ["MIEN_BAC", "MIEN_TRUNG", "MIEN_NAM"];

const sortRegionsArray = (regions: string[]) =>
  regions.slice().sort((a, b) => REGION_ORDER.indexOf(a) - REGION_ORDER.indexOf(b));

// Company colors - using a palette that works well together
const COMPANY_COLORS: string[] = [
  ACCENT_COLOR,
  "#B06A55",
  "#4E7C9A",
  "#4C8471",
  "#8B72B0",
  "#D99145",
  "#C67794",
  "#4BA6A0",
];

type RangeOption = {
  label: string;
  value: number;
};

type SeriesOption = {
  id: string;
  code: string;
  name: string;
  product: string;
  regions: string[];
  unit: string;
};

type PricePoint = {
  ts: string;
  value: number;
  source: string | null;
  region?: string;
  company?: string | null;
};

const rangeOptions: RangeOption[] = [
  { label: "Mới nhất", value: 0 },
  { label: "7 ngày", value: 7 },
  { label: "30 ngày", value: 30 },
];

const DEFAULT_RANGE_VALUE = 7;

type ChartType = "line" | "area" | "bar";

const chartTypeOptions: { label: string; value: ChartType }[] = [
  { label: "Đường (Line)", value: "line" },
  { label: "Vùng (Area)", value: "area" },
  { label: "Cột (Bar)", value: "bar" },
];

type ApiSeriesResponse = SeriesOption[];

type ApiPriceResponse = {
  series: {
    code: string;
    name: string;
    unit: string;
    region: string;
    product: string;
  };
  range: number;
  points: PricePoint[];
};

type ApiPriceRegionsResponse = ApiPriceResponse & {
  regions?: Record<string, PricePoint[]>;
};

type ApiPriceCompaniesResponse = ApiPriceResponse & {
  companies?: Record<string, PricePoint[]>;
};

type PriceChartProps = {
  initialSeriesOptions?: SeriesOption[];
  initialProduct?: string;
  initialRegion?: string;
  initialRangeDays?: number;
  initialSeriesMeta?: {
    code: string;
    name: string;
    unit: string;
    region: string;
    product: string;
  } | null;
  initialData?: PricePoint[];
  initialComparisonData?: Record<string, PricePoint[]>;
};

export default function PriceChart({
  initialSeriesOptions,
  initialProduct,
  initialRegion,
  initialRangeDays = DEFAULT_RANGE_VALUE,
  initialSeriesMeta = null,
  initialData = [],
  initialComparisonData = {},
}: PriceChartProps) {
  const { theme } = useTheme();
  const axisColor = theme === "light" ? "#1f2933" : "#d1d5db";
  const gridColor = theme === "light" ? "rgba(15,23,42,0.08)" : "rgba(255,255,255,0.08)";
  const tooltipBg = theme === "light" ? "rgba(255,255,255,0.96)" : "rgba(11,11,11,0.95)";
  const tooltipBorder = theme === "light" ? "rgba(15,23,42,0.12)" : "rgba(255,255,255,0.08)";
  const tooltipText = theme === "light" ? "#1f2933" : "#f6f7f9";
  const legendTextColor = theme === "light" ? "#1f2933" : "#d1d5db";
  const [seriesOptions, setSeriesOptions] = useState<SeriesOption[]>(initialSeriesOptions ?? []);
  const [selectedProduct, setSelectedProduct] = useState<string>(
    initialProduct ?? initialSeriesMeta?.product ?? ""
  );
  const [selectedRegions, setSelectedRegions] = useState<string[]>(
    (() => {
      const initial = initialRegion ?? initialSeriesMeta?.region ?? "ALL";
      if (initial === "ALL") {
        return ["ALL"];
      }
      return [initial];
    })()
  );
  const [selectedCompany, setSelectedCompany] = useState<string>("ALL");
  const [companyOptions, setCompanyOptions] = useState<string[]>([]);
  const [seriesMeta, setSeriesMeta] = useState(initialSeriesMeta);
  const [selectedRange, setSelectedRange] = useState<RangeOption>(
    rangeOptions.find((option) => option.value === initialRangeDays) ??
      rangeOptions.find((option) => option.value === DEFAULT_RANGE_VALUE) ??
      rangeOptions[0]
  );
  const [chartType, setChartType] = useState<ChartType>("line");
  const [data, setData] = useState<PricePoint[]>(initialData);
  const [comparisonData, setComparisonData] = useState<Record<string, PricePoint[]>>(
    initialComparisonData
  );
  const [companyComparisonData, setCompanyComparisonData] = useState<Record<string, PricePoint[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seriesLoading, setSeriesLoading] = useState(!((initialSeriesOptions ?? []).length > 0));
  const [seriesError, setSeriesError] = useState<string | null>(null);
  const initialLoadHandledRef = useRef(false);

  const isAllRegionsSelected =
    selectedRegions.length === 0 || selectedRegions.includes("ALL");
  const normalizedSelectedRegions = sortRegionsArray(
    selectedRegions.filter((region) => region !== "ALL")
  );
  const isMultiRegionSelected =
    !isAllRegionsSelected && normalizedSelectedRegions.length > 1;
  const isSingleRegionSelected =
    !isAllRegionsSelected && normalizedSelectedRegions.length === 1;
  const primaryRegion = isAllRegionsSelected
    ? "ALL"
    : normalizedSelectedRegions[0] ?? "ALL";
  const regionSelectionKey = isAllRegionsSelected
    ? "ALL"
    : normalizedSelectedRegions.join("|");

  useEffect(() => {
    if (seriesOptions.length > 0) {
      setSeriesLoading(false);
      return;
    }

    let ignore = false;
    setSeriesLoading(true);
    setSeriesError(null);

    fetch("/api/price/series", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Lỗi tải danh sách series (${response.status})`);
        }
        const payload: ApiSeriesResponse = await response.json();
        if (!ignore) {
          setSeriesOptions(payload);
          if (payload.length > 0) {
            setSelectedProduct((prev) => prev || payload[0].product);
            setSelectedRegions(["ALL"]);
          } else {
            setSelectedProduct("");
            setSelectedRegions(["ALL"]);
            setSeriesMeta(null);
          }
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          const message = err instanceof Error ? err.message : "Không tải được series";
          setSeriesError(message);
        }
      })
      .finally(() => {
        if (!ignore) {
          setSeriesLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [seriesOptions.length]);

  useEffect(() => {
    if (!selectedProduct) {
      setData([]);
      setComparisonData({});
      return;
    }

    let ignore = false;
    const controller = new AbortController();

    async function fetchData() {
      const usingInitialPayload =
        !initialLoadHandledRef.current &&
        initialSeriesMeta &&
        selectedProduct === initialSeriesMeta.product &&
        selectedRange.value === (initialRangeDays ?? DEFAULT_RANGE_VALUE) &&
        (isAllRegionsSelected
          ? Object.keys(initialComparisonData).length > 0
          : isSingleRegionSelected && initialData.length > 0);

      if (usingInitialPayload) {
        initialLoadHandledRef.current = true;
        return;
      }

      initialLoadHandledRef.current = true;
      setLoading(true);
      setError(null);

      // If "ALL" regions selected, fetch all three regions for comparison
      if (isAllRegionsSelected) {
        try {
          const companyParam = selectedCompany !== "ALL" ? `&company=${encodeURIComponent(selectedCompany)}` : "";
          const response = await fetch(
            `/api/price/${selectedProduct}?range=${selectedRange.value}&region=ALL${companyParam}`,
            {
              signal: controller.signal,
              cache: "no-store",
            }
          );

          if (!response.ok) {
            if (response.status === 404) {
              if (!ignore) {
                setSeriesMeta({
                  code: selectedProduct,
                  name: selectedProduct,
                  unit: "",
                  region: "ALL",
                  product: selectedProduct,
                });
                setComparisonData({});
                setData([]);
                setError("Hiện chưa có dữ liệu cho lựa chọn này. Vui lòng thử lại sau.");
              }
              return;
            }
            throw new Error(`Lỗi tải dữ liệu (${response.status})`);
          }

          const payload: ApiPriceRegionsResponse = await response.json();

          if (!ignore) {
            setSeriesMeta({
              code: payload.series.code,
              name: payload.series.name,
              unit: payload.series.unit,
              region: "ALL",
              product: payload.series.product,
            });

            const regionMap = payload.regions;

            if (regionMap && Object.keys(regionMap).length > 0) {
              setComparisonData(regionMap);
            } else {
              const fallbackData: Record<string, PricePoint[]> = {};
              (payload.points ?? []).forEach((point) => {
                const regionKey = point.region ?? "ALL";
                const bucket = fallbackData[regionKey] ?? [];
                bucket.push(point);
                fallbackData[regionKey] = bucket;
              });
              setComparisonData(fallbackData);
            }
            setData([]);
          }
        } catch (err) {
          if (!ignore && err instanceof Error && err.name !== "AbortError") {
            setError(err.message);
          }
        } finally {
          if (!ignore) {
            setLoading(false);
          }
        }
        return;
      }

      if (isMultiRegionSelected) {
        if (selectedCompany === "ALL") {
          if (!ignore) {
            setError("Vui lòng chọn một công ty để so sánh giữa nhiều vùng.");
            setComparisonData({});
            setCompanyComparisonData({});
            setData([]);
            setLoading(false);
          }
          return;
        }

        try {
          const params = new URLSearchParams({ range: String(selectedRange.value) });
          selectedRegions.forEach((region) => params.append("regions", region));
          if (selectedCompany && selectedCompany !== "ALL") {
            params.append("company", selectedCompany);
          }

          const response = await fetch(
            `/api/price/${selectedProduct}?${params.toString()}`,
            {
              signal: controller.signal,
              cache: "no-store",
            }
          );

          if (response.status === 404) {
            if (!ignore) {
              setSeriesMeta({
                code: selectedProduct,
                name: selectedProduct,
                unit: "",
                region: "MULTI",
                product: selectedProduct,
              });
              setComparisonData({});
              setCompanyComparisonData({});
              setData([]);
              setError("Không tìm thấy dữ liệu cho các vùng đã chọn.");
            }
            return;
          }

          if (!response.ok) {
            throw new Error(`Lỗi tải dữ liệu (${response.status})`);
          }

          const payload: ApiPriceRegionsResponse = await response.json();
          if (!ignore) {
            setSeriesMeta({
              code: payload.series.code,
              name: payload.series.name,
              unit: payload.series.unit,
              region: "MULTI",
              product: payload.series.product,
            });

            const regionMap = payload.regions ?? {};
            setComparisonData(regionMap);
            setCompanyComparisonData({});
            setData([]);
          }
        } catch (err) {
          if (!ignore && err instanceof Error && err.name !== "AbortError") {
            setError(err.message);
          }
        } finally {
          if (!ignore) {
            setLoading(false);
          }
        }
        return;
      }

      // Normal mode - single region
      try {
        const companyParam = selectedCompany !== "ALL" ? `&company=${encodeURIComponent(selectedCompany)}` : "";
        const response = await fetch(
          `/api/price/${selectedProduct}?range=${selectedRange.value}&region=${primaryRegion}${companyParam}`,
          {
            signal: controller.signal,
            cache: "no-store",
          }
        );

        if (response.status === 404) {
          if (!ignore) {
            const matchedSeries = seriesOptions.find((item) => item.product === selectedProduct);
            setSeriesMeta({
              code: matchedSeries?.code ?? selectedProduct,
              name: matchedSeries?.name ?? matchedSeries?.code ?? selectedProduct,
              unit: matchedSeries?.unit ?? "",
              region: primaryRegion,
              product: selectedProduct,
            });
            setData([]);
            setComparisonData({});
            setError("Hiện chưa có dữ liệu cho lựa chọn này. Vui lòng chọn vùng khác hoặc thử lại sau.");
          }
          return;
        }

        if (!response.ok) {
          throw new Error(`Lỗi tải dữ liệu (${response.status})`);
        }

        const payload: ApiPriceCompaniesResponse = await response.json();
        if (!ignore) {
          setSeriesMeta({
            code: payload.series.code,
            name: payload.series.name,
            unit: payload.series.unit,
            region: payload.series.region,
            product: payload.series.product,
          });

          // Check if we have company comparison data
          if (payload.companies && Object.keys(payload.companies).length > 0) {
            setCompanyComparisonData(payload.companies);
            setData([]);
            setComparisonData({});
          } else {
            setData(payload.points);
            setCompanyComparisonData({});
            setComparisonData({});
          }
        }
      } catch (err) {
        if (!ignore && err instanceof Error && err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [
    selectedProduct,
    regionSelectionKey,
    selectedCompany,
    selectedRange,
    seriesOptions,
    initialSeriesMeta,
    initialComparisonData,
    initialData,
    initialRangeDays,
    isAllRegionsSelected,
    isMultiRegionSelected,
    primaryRegion,
  ]);

  const chartData = useMemo(
    () =>
      data.map((point) => ({
        ...point,
        dateLabel: new Date(point.ts).toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: selectedRange.value >= 30 ? "short" : "numeric",
        }),
      })),
    [data, selectedRange.value]
  );

  const comparisonChartData = useMemo(() => {
    const allTimestamps = new Set<string>();
    Object.values(comparisonData).forEach((points) => {
      points.forEach((point) => allTimestamps.add(point.ts));
    });

    const sortedTimestamps = Array.from(allTimestamps).sort();

    return sortedTimestamps.map((ts) => {
      const dataPoint: Record<string, string | number | undefined> = {
        ts,
        dateLabel: new Date(ts).toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: selectedRange.value >= 30 ? "short" : "numeric",
        }),
      };

      Object.entries(comparisonData).forEach(([region, points]) => {
        const matches = points.filter((point) => point.ts === ts);
        if (matches.length > 0) {
          const sum = matches.reduce((total, point) => total + point.value, 0);
          dataPoint[region] = sum / matches.length;
          dataPoint[`${region}__count`] = matches.length;
        }
      });

      return dataPoint;
    });
  }, [comparisonData, selectedRange.value]);

  const companyComparisonChartData = useMemo(() => {
    const allTimestamps = new Set<string>();
    Object.values(companyComparisonData).forEach(points => {
      points.forEach(point => allTimestamps.add(point.ts));
    });

    const sortedTimestamps = Array.from(allTimestamps).sort();

    return sortedTimestamps.map(ts => {
      const dataPoint: Record<string, string | number | undefined> = {
        ts,
        dateLabel: new Date(ts).toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: selectedRange.value >= 30 ? "short" : "numeric",
        }),
      };

      Object.entries(companyComparisonData).forEach(([company, points]) => {
        const point = points.find(p => p.ts === ts);
        if (point) {
          dataPoint[company] = point.value;
        }
      });

      return dataPoint;
    });
  }, [companyComparisonData, selectedRange.value]);

const tableData = useMemo(() => {
    if (isAllRegionsSelected || isMultiRegionSelected) {
      const allPoints: PricePoint[] = [];
      Object.entries(comparisonData).forEach(([region, points]) => {
        points.forEach((point) => {
          allPoints.push({ ...point, region, company: point.company ?? null });
        });
      });
      return allPoints.sort((a, b) => b.ts.localeCompare(a.ts));
    }

    if (Object.keys(companyComparisonData).length > 0) {
      const allPoints: PricePoint[] = [];
      Object.entries(companyComparisonData).forEach(([company, points]) => {
        points.forEach((point) => {
          allPoints.push({
            ...point,
            region: primaryRegion,
            company: company === "null" ? null : company,
          });
        });
      });
      return allPoints.sort((a, b) => b.ts.localeCompare(a.ts));
    }

    return data;
  }, [
    comparisonData,
    companyComparisonData,
    data,
    isAllRegionsSelected,
    isMultiRegionSelected,
    primaryRegion,
  ]);

  const displayRegionLabel = isAllRegionsSelected
    ? "Tất cả vùng"
    : normalizedSelectedRegions
        .map((region) => REGION_LABELS[region] ?? region)
        .join(", ");

  const tableRegionValue = isSingleRegionSelected ? primaryRegion : undefined;
  const regionSeriesKeys = isAllRegionsSelected ? REGION_ORDER : normalizedSelectedRegions;

  const activePointCount = useMemo(() => {
    if (isAllRegionsSelected || isMultiRegionSelected) {
      return comparisonChartData.length;
    }
    if (companyComparisonChartData.length > 0) {
      return companyComparisonChartData.length;
    }
    return chartData.length;
  }, [
    chartData,
    comparisonChartData,
    companyComparisonChartData,
    isAllRegionsSelected,
    isMultiRegionSelected,
  ]);

  const minChartWidth = useMemo(() => {
    if (activePointCount <= 1) {
      return 360;
    }
    const baseWidth = chartType === "bar" ? 80 : 64;
    return Math.max(360, activePointCount * baseWidth);
  }, [activePointCount, chartType]);

  const handleRegionToggle = (region: string) => {
    if (region === "ALL") {
      setSelectedRegions(["ALL"]);
      return;
    }

    setSelectedRegions((prev) => {
      const filtered = prev.filter((value) => value !== "ALL");
      const hasRegion = filtered.includes(region);
      let next = hasRegion
        ? filtered.filter((value) => value !== region)
        : [...filtered, region];

      if (next.length === 0) {
        return ["ALL"];
      }

      next = Array.from(new Set(next));
      return sortRegionsArray(next);
    });
  };

  const formatTooltipValue = (value: number) =>
    `${Intl.NumberFormat("vi-VN").format(value)} ${seriesMeta?.unit ?? "đ/kg"}`;

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { ts: string; value: number } }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const date = new Date(data.ts);
      const formattedDate = date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });

      return (
        <div
          style={{
            backgroundColor: tooltipBg,
            border: `1px solid ${tooltipBorder}`,
            borderRadius: "16px",
            color: tooltipText,
            padding: "12px 16px",
          }}
        >
          <p style={{ color: "#f7c948", fontSize: 12, textTransform: "uppercase", marginBottom: "4px" }}>
            {formattedDate}
          </p>
          <p style={{ fontSize: 14 }}>
            <span style={{ fontWeight: 500 }}>Giá: </span>
            {formatTooltipValue(data.value)}
          </p>
        </div>
      );
    }
    return null;
  };

  const ComparisonTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    const basePayload = payload[0]?.payload as Record<string, unknown> | undefined;
    const ts = basePayload?.ts;
    const date = ts && typeof ts === "string" ? new Date(ts) : null;
    const formattedDate = date
      ? date.toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : null;

    const regionsWithValue = regionSeriesKeys.map((region) => {
      const item = payload.find((entry) => entry?.dataKey === region && typeof entry.value === "number");
      if (!item || typeof item.value !== "number") {
        return null;
      }
      const countKey = `${region}__count`;
      const rawCount = basePayload && typeof basePayload[countKey] === "number" ? (basePayload[countKey] as number) : 1;
      return {
        region,
        value: item.value,
        count: rawCount,
      };
    }).filter(Boolean) as Array<{ region: string; value: number; count: number }>;

    if (regionsWithValue.length === 0) {
      return null;
    }

    const hasAveraged = regionsWithValue.some(({ count }) => count > 1);

    return (
      <div
        style={{
          backgroundColor: tooltipBg,
          border: `1px solid ${tooltipBorder}`,
          borderRadius: "16px",
          color: tooltipText,
          padding: "12px 16px",
          minWidth: "200px",
        }}
      >
        {formattedDate ? (
          <p style={{ color: "#f7c948", fontSize: 12, textTransform: "uppercase", marginBottom: "6px" }}>
            {formattedDate}
          </p>
        ) : null}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {regionsWithValue
            .sort((a, b) => b.value - a.value)
            .map(({ region, value }) => (
            <div key={region} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: 12, color: "#d1d5db" }}>
                <span
                  aria-hidden
                  style={{
                    display: "inline-block",
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    backgroundColor: REGION_COLORS[region] ?? "#f7c948",
                  }}
                />
                {REGION_LABELS[region] ?? region}
              </span>
              <span style={{ fontSize: 12, color: tooltipText, fontWeight: 500 }}>
                {formatTooltipValue(value)}
              </span>
            </div>
          ))}
          {hasAveraged ? (
            <span style={{ fontSize: 10, color: "rgba(209,213,219,0.75)" }}>
              Giá trung bình theo ngày (tổng hợp từ nhiều công ty).
            </span>
          ) : null}
        </div>
      </div>
    );
  };

  const CompanyTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    const basePayload = payload[0]?.payload as { ts?: string } | undefined;
    const ts = basePayload?.ts;
    const date = ts ? new Date(ts) : null;
    const formattedDate = date
      ? date.toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : null;

    const companiesWithValue = payload
      .filter((entry) => entry?.dataKey && entry.dataKey !== "ts" && entry.dataKey !== "dateLabel" && typeof entry.value === "number")
      .map((entry) => ({
        company: String(entry.dataKey),
        value: entry.value as number,
        color: entry.color ?? "#f7c948",
      }))
      .sort((a, b) => b.value - a.value);

    if (companiesWithValue.length === 0) {
      return null;
    }

    return (
      <div
        style={{
          backgroundColor: tooltipBg,
          border: `1px solid ${tooltipBorder}`,
          borderRadius: "16px",
          color: tooltipText,
          padding: "12px 16px",
          minWidth: "200px",
        }}
      >
        {formattedDate ? (
          <p style={{ color: "#f7c948", fontSize: 12, textTransform: "uppercase", marginBottom: "6px" }}>
            {formattedDate}
          </p>
        ) : null}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {companiesWithValue.map(({ company, value, color }) => (
            <div key={company} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: 12, color: "#d1d5db" }}>
                <span
                  aria-hidden
                  style={{
                    display: "inline-block",
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    backgroundColor: color,
                  }}
                />
                {company === "null" ? "Chưa phân loại" : company}
              </span>
              <span style={{ fontSize: 12, color: tooltipText, fontWeight: 500 }}>
                {formatTooltipValue(value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const productOptions = useMemo(() => {
    const map = new Map<string, string>();
    seriesOptions.forEach((series) => {
      if (!map.has(series.product)) {
        map.set(series.product, series.name);
      }
    });
    return Array.from(map.entries()).map(([product, name]) => ({ product, name }));
  }, [seriesOptions]);

  useEffect(() => {
    if (!selectedProduct && productOptions.length > 0) {
      setSelectedProduct(productOptions[0].product);
    }
  }, [productOptions, selectedProduct]);

  const regionOptions = useMemo(() => {
    const regions = new Set<string>();
    seriesOptions
      .filter((series) => series.product === selectedProduct)
      .forEach((series) => series.regions.forEach((region) => regions.add(region.toUpperCase())));
    return ["ALL", ...Array.from(regions)];
  }, [seriesOptions, selectedProduct]);

  useEffect(() => {
    setSelectedRegions((prev) => {
      const available = new Set(regionOptions);
      let next = prev.filter((region) => available.has(region));

      if (next.length === 0) {
        next = ["ALL"];
      }

      if (next.includes("ALL") && next.length > 1) {
        next = ["ALL"];
      }

      const prevKey = prev.join("|");
      const nextKey = next.join("|");
      if (prevKey === nextKey) {
        return prev;
      }

      return next;
    });
  }, [regionOptions]);

  // Fetch company options based on selected product and region
  useEffect(() => {
    if (!selectedProduct) {
      setCompanyOptions([]);
      return;
    }

    let ignore = false;
    const controller = new AbortController();

    async function fetchCompanies() {
      try {
        const selectedSeries = seriesOptions.find((s) => s.product === selectedProduct);
        if (!selectedSeries) {
          if (!ignore) {
            setCompanyOptions([]);
          }
          return;
        }

        const params = new URLSearchParams({ series: selectedSeries.id });
        if (!isAllRegionsSelected) {
          params.append("regions", selectedRegions.join(","));
        }

        const response = await fetch(`/api/prices/metadata?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch companies");
        }

        const payload: { companies: string[] } = await response.json();
        if (!ignore) {
          setCompanyOptions(payload.companies);
        }
      } catch (err) {
        if (!ignore && err instanceof Error && err.name !== "AbortError") {
          console.error("Failed to fetch companies:", err);
          setCompanyOptions([]);
        }
      }
    }

    fetchCompanies();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [selectedProduct, regionSelectionKey, seriesOptions, isAllRegionsSelected]);

  useEffect(() => {
    if (isMultiRegionSelected && (selectedCompany === "ALL" || !selectedCompany) && companyOptions.length > 0) {
      setSelectedCompany(companyOptions[0]);
    }
  }, [isMultiRegionSelected, selectedCompany, companyOptions]);

  return (
    <div className="theme-panel space-y-4 md:space-y-6 rounded-2xl md:rounded-3xl border p-4 md:p-8 shadow-[0_40px_120px_rgba(0,0,0,0.45)] backdrop-blur">
      <div className="flex flex-col gap-3 md:gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1 md:space-y-2">
          <h2 className="text-xl md:text-2xl lg:text-3xl font-serif text-[#f6f7f9]">
            {seriesMeta?.name ?? (seriesLoading ? "Đang tải..." : "Không có dữ liệu")}
          </h2>
          <div className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400/90">
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 uppercase tracking-[0.25em] text-[#f7c948]/80">
              {seriesMeta?.unit ?? "VND/kg"}
            </span>
            <span className="inline-flex items-center gap-2 text-gray-300">
              <span className="text-white/40">•</span>
              <span>{displayRegionLabel}</span>
            </span>
          </div>
        </div>
        <div className="grid gap-3 md:gap-4 md:grid-cols-12">
          <label className="md:col-span-3 flex flex-col text-[10px] md:text-xs uppercase tracking-wide text-gray-400">
            Sản phẩm
            <select
              value={selectedProduct}
              onChange={(event) => {
                setSelectedProduct(event.target.value);
                setSelectedRegions(["ALL"]);
                setSelectedCompany("ALL");
              }}
              className="theme-field mt-1 w-full rounded-full border px-3 py-2 text-xs md:text-sm outline-none transition focus:border-[#f7c948]"
              disabled={seriesLoading || !!seriesError}
            >
              {productOptions.length === 0 ? (
                <option>Không có sản phẩm</option>
              ) : (
                productOptions.map((product) => (
                  <option key={product.product} value={product.product} className="bg-white text-black dark:bg-[#0b0b0b] dark:text-white">
                    {product.name}
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="md:col-span-3 flex flex-col text-[10px] md:text-xs uppercase tracking-wide text-gray-400">
            Công ty
            <select
              value={selectedCompany}
              onChange={(event) => setSelectedCompany(event.target.value)}
              className="theme-field mt-1 w-full rounded-full border px-3 py-2 text-xs md:text-sm outline-none transition focus:border-[#f7c948]"
              disabled={seriesLoading || !!seriesError}
            >
              <option value="ALL" className="bg-white text-black dark:bg-[#0b0b0b] dark:text-white">
                {companyOptions.length === 0 ? "Không có dữ liệu" : "Tất cả công ty"}
              </option>
              {companyOptions.map((company) => (
                <option key={company} value={company} className="bg-white text-black dark:bg-[#0b0b0b] dark:text-white">
                  {company}
                </option>
              ))}
            </select>
          </label>

          <label className="md:col-span-3 flex flex-col text-[10px] md:text-xs uppercase tracking-wide text-gray-400">
            Thời gian
            <select
              value={selectedRange.value}
              onChange={(event) => {
                const option = rangeOptions.find((item) => item.value === Number(event.target.value));
                if (option) {
                  setSelectedRange(option);
                }
              }}
              className="theme-field mt-1 w-full rounded-full border px-3 py-2 text-xs md:text-sm outline-none transition focus:border-[#f7c948]"
            >
              {rangeOptions.map((option) => (
                <option key={option.value} value={option.value} className="bg-white text-black dark:bg-[#0b0b0b] dark:text-white">
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="md:col-span-3 flex flex-col text-[10px] md:text-xs uppercase tracking-wide text-gray-400">
            Biểu đồ
            <select
              value={chartType}
              onChange={(event) => setChartType(event.target.value as ChartType)}
              className="theme-field mt-1 w-full rounded-full border px-3 py-2 text-xs md:text-sm outline-none transition focus:border-[#f7c948]"
            >
              {chartTypeOptions.map((option) => (
                <option key={option.value} value={option.value} className="bg-white text-black dark:bg-[#0b0b0b] dark:text-white">
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="md:col-span-12 flex flex-col text-[10px] md:text-xs uppercase tracking-wide text-gray-400">
            Vùng miền
            <div className="mt-2 flex flex-wrap gap-2">
              {regionOptions.map((region) => {
                const isActive = region === "ALL"
                  ? isAllRegionsSelected
                  : !isAllRegionsSelected && selectedRegions.includes(region);
                return (
                  <button
                    key={region}
                    type="button"
                    onClick={() => handleRegionToggle(region)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      isActive
                        ? "border-transparent bg-[#f7c948] text-black shadow-[0_4px_16px_rgba(247,201,72,0.35)]"
                        : "border-white/20 text-gray-200 hover:border-[#f7c948]/60"
                    }`}
                    disabled={seriesLoading || !!seriesError}
                  >
                    {region === "ALL" ? "Tất cả vùng" : REGION_LABELS[region] ?? region}
                  </button>
                );
              })}
            </div>
            {isMultiRegionSelected ? (
              <span className="mt-1 text-[10px] text-gray-400">
                {selectedCompany === "ALL"
                  ? "Chọn một công ty để so sánh giữa các vùng."
                  : `So sánh ${selectedCompany} tại ${displayRegionLabel}.`}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="h-[280px] md:h-[340px] w-full overflow-x-auto md:overflow-visible">
        <div className="h-full w-full" style={{ minWidth: `${minChartWidth}px` }}>
          {seriesError ? (
            <div className="flex h-full items-center justify-center text-sm text-red-400">
              {seriesError}
            </div>
          ) : loading ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-400">
              Đang tải dữ liệu…
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center text-sm text-red-400">
              {error}
            </div>
          ) : ((isAllRegionsSelected || isMultiRegionSelected)
              ? comparisonChartData.length === 0
              : (companyComparisonChartData.length > 0 ? companyComparisonChartData.length === 0 : chartData.length === 0)) ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-400">
              Chưa có dữ liệu cho lựa chọn này.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "line" ? (
              (isAllRegionsSelected || isMultiRegionSelected) ? (
                <LineChart data={comparisonChartData}>
                  <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="dateLabel"
                    stroke={axisColor}
                    tickLine={false}
                    tick={{ fill: axisColor }}
                    axisLine={false}
                    fontSize={12}
                  />
                  <YAxis
                    stroke={axisColor}
                    tickLine={false}
                    tick={{ fill: axisColor }}
                    axisLine={false}
                    fontSize={12}
                    tickFormatter={(value: number) => Intl.NumberFormat("vi-VN").format(value / 1000) + "k"}
                  />
                  <Tooltip
                    cursor={{
                      stroke:
                        theme === "light" ? "rgba(15,23,42,0.1)" : "rgba(247,201,72,0.35)",
                      strokeWidth: 1.5,
                    }}
                    content={<ComparisonTooltip />}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: "20px" }}
                    iconType="line"
                    formatter={(value) => <span style={{ color: legendTextColor, fontSize: 12 }}>{REGION_LABELS[value as string] ?? value}</span>}
                  />
                  <Line
                    type="monotone"
                    dataKey="MIEN_BAC"
                    stroke={REGION_COLORS.MIEN_BAC}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 6, strokeWidth: 0, fill: REGION_COLORS.MIEN_BAC }}
                    name="MIEN_BAC"
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="MIEN_TRUNG"
                    stroke={REGION_COLORS.MIEN_TRUNG}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 6, strokeWidth: 0, fill: REGION_COLORS.MIEN_TRUNG }}
                    name="MIEN_TRUNG"
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="MIEN_NAM"
                    stroke={REGION_COLORS.MIEN_NAM}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 6, strokeWidth: 0, fill: REGION_COLORS.MIEN_NAM }}
                    name="MIEN_NAM"
                    connectNulls
                  />
                </LineChart>
              ) : companyComparisonChartData.length > 0 ? (
                <LineChart data={companyComparisonChartData}>
                  <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="dateLabel"
                    stroke={axisColor}
                    tickLine={false}
                    tick={{ fill: axisColor }}
                    axisLine={false}
                    fontSize={12}
                  />
                  <YAxis
                    stroke={axisColor}
                    tickLine={false}
                    tick={{ fill: axisColor }}
                    axisLine={false}
                    fontSize={12}
                    tickFormatter={(value: number) => Intl.NumberFormat("vi-VN").format(value / 1000) + "k"}
                  />
                  <Tooltip
                    cursor={{
                      stroke:
                        theme === "light" ? "rgba(15,23,42,0.1)" : "rgba(247,201,72,0.35)",
                      strokeWidth: 1.5,
                    }}
                    content={<CompanyTooltip />}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: "20px" }}
                    iconType="line"
                    formatter={(value) => <span style={{ color: legendTextColor, fontSize: 12 }}>{value === "null" ? "Chưa phân loại" : value}</span>}
                  />
                  {Object.keys(companyComparisonData).map((company, index) => (
                    <Line
                      key={company}
                      type="monotone"
                      dataKey={company}
                      stroke={COMPANY_COLORS[index % COMPANY_COLORS.length]}
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 6, strokeWidth: 0, fill: COMPANY_COLORS[index % COMPANY_COLORS.length] }}
                      name={company}
                      connectNulls
                    />
                  ))}
                </LineChart>
              ) : (
                <LineChart data={chartData}>
                  <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="dateLabel"
                    stroke={axisColor}
                    tickLine={false}
                    tick={{ fill: axisColor }}
                    axisLine={false}
                    fontSize={12}
                  />
                  <YAxis
                    stroke={axisColor}
                    tickLine={false}
                    tick={{ fill: axisColor }}
                    axisLine={false}
                    fontSize={12}
                    tickFormatter={(value: number) => Intl.NumberFormat("vi-VN").format(value / 1000) + "k"}
                  />
                  <Tooltip
                    cursor={{
                      stroke:
                        theme === "light" ? "rgba(15,23,42,0.1)" : "rgba(247,201,72,0.35)",
                      strokeWidth: 1.5,
                    }}
                    content={<CustomTooltip />}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={REGION_COLORS.MIEN_BAC}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 6, strokeWidth: 0, fill: REGION_COLORS.MIEN_TRUNG }}
                  />
                </LineChart>
              )
            ) : chartType === "area" ? (
              (isAllRegionsSelected || isMultiRegionSelected) ? (
                <AreaChart data={comparisonChartData}>
                  <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="dateLabel"
                    stroke={axisColor}
                    tickLine={false}
                    tick={{ fill: axisColor }}
                    axisLine={false}
                    fontSize={12}
                  />
                  <YAxis
                    stroke={axisColor}
                    tickLine={false}
                    tick={{ fill: axisColor }}
                    axisLine={false}
                    fontSize={12}
                    tickFormatter={(value: number) => Intl.NumberFormat("vi-VN").format(value / 1000) + "k"}
                  />
                  <Tooltip
                    cursor={{ stroke: theme === "light" ? "rgba(15,23,42,0.1)" : "rgba(247,201,72,0.35)", strokeWidth: 1.5 }}
                    content={<ComparisonTooltip />}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: "20px" }}
                    iconType="rect"
                    formatter={(value) => <span style={{ color: legendTextColor, fontSize: 12 }}>{REGION_LABELS[value as string] ?? value}</span>}
                  />
                  <defs>
                    <linearGradient id="colorMienBac" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f7c948" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#f7c948" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="colorMienTrung" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#B06A55" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#B06A55" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="colorMienNam" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4E7C9A" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#4E7C9A" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="MIEN_BAC"
                    stroke={REGION_COLORS.MIEN_BAC}
                    strokeWidth={2.5}
                    fill="url(#colorMienBac)"
                    fillOpacity={0.6}
                    name="MIEN_BAC"
                    connectNulls
                  />
                  <Area
                    type="monotone"
                    dataKey="MIEN_TRUNG"
                    stroke={REGION_COLORS.MIEN_TRUNG}
                    strokeWidth={2.5}
                    fill="url(#colorMienTrung)"
                    fillOpacity={0.6}
                    name="MIEN_TRUNG"
                    connectNulls
                  />
                  <Area
                    type="monotone"
                    dataKey="MIEN_NAM"
                    stroke={REGION_COLORS.MIEN_NAM}
                    strokeWidth={2.5}
                    fill="url(#colorMienNam)"
                    fillOpacity={0.6}
                    name="MIEN_NAM"
                    connectNulls
                  />
                </AreaChart>
              ) : companyComparisonChartData.length > 0 ? (
                <AreaChart data={companyComparisonChartData}>
                  <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="dateLabel"
                    stroke={axisColor}
                    tickLine={false}
                    tick={{ fill: axisColor }}
                    axisLine={false}
                    fontSize={12}
                  />
                  <YAxis
                    stroke={axisColor}
                    tickLine={false}
                    tick={{ fill: axisColor }}
                    axisLine={false}
                    fontSize={12}
                    tickFormatter={(value: number) => Intl.NumberFormat("vi-VN").format(value / 1000) + "k"}
                  />
                  <Tooltip
                    cursor={{ stroke: theme === "light" ? "rgba(15,23,42,0.1)" : "rgba(247,201,72,0.35)", strokeWidth: 1.5 }}
                    content={<CompanyTooltip />}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: "20px" }}
                    iconType="rect"
                    formatter={(value) => <span style={{ color: legendTextColor, fontSize: 12 }}>{value === "null" ? "Chưa phân loại" : value}</span>}
                  />
                  <defs>
                    {Object.keys(companyComparisonData).map((company, index) => (
                      <linearGradient key={company} id={`colorCompany${index}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COMPANY_COLORS[index % COMPANY_COLORS.length]} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={COMPANY_COLORS[index % COMPANY_COLORS.length]} stopOpacity={0.1} />
                      </linearGradient>
                    ))}
                  </defs>
                  {Object.keys(companyComparisonData).map((company, index) => (
                    <Area
                      key={company}
                      type="monotone"
                      dataKey={company}
                      stroke={COMPANY_COLORS[index % COMPANY_COLORS.length]}
                      strokeWidth={2.5}
                      fill={`url(#colorCompany${index})`}
                      fillOpacity={0.6}
                      name={company}
                      connectNulls
                    />
                  ))}
                </AreaChart>
              ) : (
                <AreaChart data={chartData}>
                  <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="dateLabel"
                    stroke={axisColor}
                    tickLine={false}
                    tick={{ fill: axisColor }}
                    axisLine={false}
                    fontSize={12}
                  />
                  <YAxis
                    stroke={axisColor}
                    tickLine={false}
                    tick={{ fill: axisColor }}
                    axisLine={false}
                    fontSize={12}
                    tickFormatter={(value: number) => Intl.NumberFormat("vi-VN").format(value / 1000) + "k"}
                  />
                  <Tooltip
                    cursor={{ stroke: theme === "light" ? "rgba(15,23,42,0.1)" : "rgba(247,201,72,0.35)", strokeWidth: 1.5 }}
                    content={<CustomTooltip />}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={REGION_COLORS.MIEN_BAC}
                    strokeWidth={2.5}
                    fill="url(#colorValue)"
                    fillOpacity={0.6}
                  />
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f7c948" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#f7c948" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                </AreaChart>
              )
            ) : (
              (isAllRegionsSelected || isMultiRegionSelected) ? (
                <BarChart data={comparisonChartData}>
                  <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="dateLabel"
                    stroke={axisColor}
                    tickLine={false}
                    tick={{ fill: axisColor }}
                    axisLine={false}
                    fontSize={12}
                  />
                  <YAxis
                    stroke={axisColor}
                    tickLine={false}
                    tick={{ fill: axisColor }}
                    axisLine={false}
                    fontSize={12}
                    tickFormatter={(value: number) => Intl.NumberFormat("vi-VN").format(value / 1000) + "k"}
                  />
                  <Tooltip
                    cursor={{ fill: theme === "light" ? "rgba(15,23,42,0.06)" : "rgba(247,201,72,0.1)" }}
                    content={<ComparisonTooltip />}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: "20px" }}
                    iconType="rect"
                    formatter={(value) => <span style={{ color: legendTextColor, fontSize: 12 }}>{REGION_LABELS[value as string] ?? value}</span>}
                  />
                  <Bar
                    dataKey="MIEN_BAC"
                    fill={REGION_COLORS.MIEN_BAC}
                    radius={[8, 8, 0, 0]}
                    name="MIEN_BAC"
                  />
                  <Bar
                    dataKey="MIEN_TRUNG"
                    fill={REGION_COLORS.MIEN_TRUNG}
                    radius={[8, 8, 0, 0]}
                    name="MIEN_TRUNG"
                  />
                  <Bar
                    dataKey="MIEN_NAM"
                    fill={REGION_COLORS.MIEN_NAM}
                    radius={[8, 8, 0, 0]}
                    name="MIEN_NAM"
                  />
                </BarChart>
              ) : companyComparisonChartData.length > 0 ? (
                <BarChart data={companyComparisonChartData}>
                  <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="dateLabel"
                    stroke={axisColor}
                    tickLine={false}
                    tick={{ fill: axisColor }}
                    axisLine={false}
                    fontSize={12}
                  />
                  <YAxis
                    stroke={axisColor}
                    tickLine={false}
                    tick={{ fill: axisColor }}
                    axisLine={false}
                    fontSize={12}
                    tickFormatter={(value: number) => Intl.NumberFormat("vi-VN").format(value / 1000) + "k"}
                  />
                  <Tooltip
                    cursor={{ fill: theme === "light" ? "rgba(15,23,42,0.06)" : "rgba(247,201,72,0.1)" }}
                    content={<CompanyTooltip />}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: "20px" }}
                    iconType="rect"
                    formatter={(value) => <span style={{ color: legendTextColor, fontSize: 12 }}>{value === "null" ? "Chưa phân loại" : value}</span>}
                  />
                  {Object.keys(companyComparisonData).map((company, index) => (
                    <Bar
                      key={company}
                      dataKey={company}
                      fill={COMPANY_COLORS[index % COMPANY_COLORS.length]}
                      radius={[8, 8, 0, 0]}
                      name={company}
                    />
                  ))}
                </BarChart>
              ) : (
                <BarChart data={chartData}>
                  <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="dateLabel"
                    stroke={axisColor}
                    tickLine={false}
                    tick={{ fill: axisColor }}
                    axisLine={false}
                    fontSize={12}
                  />
                  <YAxis
                    stroke={axisColor}
                    tickLine={false}
                    tick={{ fill: axisColor }}
                    axisLine={false}
                    fontSize={12}
                    tickFormatter={(value: number) => Intl.NumberFormat("vi-VN").format(value / 1000) + "k"}
                  />
                  <Tooltip
                    cursor={{ fill: theme === "light" ? "rgba(15,23,42,0.06)" : "rgba(247,201,72,0.1)" }}
                    content={<CustomTooltip />}
                  />
                  <Bar
                    dataKey="value"
                    fill={REGION_COLORS.MIEN_BAC}
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              )
            )}
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <PriceTable
        series={seriesMeta ? { code: seriesMeta.code, name: seriesMeta.name, unit: seriesMeta.unit } : null}
        rangeLabel={selectedRange.label}
        data={tableData}
        loading={loading}
        error={error ?? seriesError}
        regionLabel={displayRegionLabel}
        regionValue={tableRegionValue}
      />
    </div>
  );
}

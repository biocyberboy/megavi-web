'use client';

import { useEffect, useMemo, useState } from "react";
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

import PriceTable from "@/components/PriceTable";

const REGION_LABELS: Record<string, string> = {
  MIEN_BAC: "Miền Bắc",
  MIEN_TRUNG: "Miền Trung",
  MIEN_NAM: "Miền Nam",
  ALL: "Tất cả vùng",
};

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
};

const rangeOptions: RangeOption[] = [
  { label: "7 ngày", value: 7 },
  { label: "30 ngày", value: 30 },
  { label: "90 ngày", value: 90 },
];

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

export default function PriceChart() {
  const [seriesOptions, setSeriesOptions] = useState<SeriesOption[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [selectedRegion, setSelectedRegion] = useState<string>("ALL");
  const [seriesMeta, setSeriesMeta] = useState<{ code: string; name: string; unit: string; region: string; product: string } | null>(null);
  const [selectedRange, setSelectedRange] = useState<RangeOption>(rangeOptions[1]);
  const [chartType, setChartType] = useState<ChartType>("line");
  const [data, setData] = useState<PricePoint[]>([]);
  const [comparisonData, setComparisonData] = useState<Record<string, PricePoint[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seriesLoading, setSeriesLoading] = useState(true);
  const [seriesError, setSeriesError] = useState<string | null>(null);

  useEffect(() => {
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
            setSelectedRegion("ALL");
          } else {
            setSelectedProduct("");
            setSelectedRegion("ALL");
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
  }, []);

  useEffect(() => {
    if (!selectedProduct) {
      setData([]);
      setComparisonData({});
      return;
    }

    let ignore = false;
    const controller = new AbortController();

    async function fetchData() {
      setLoading(true);
      setError(null);

      // If "ALL" regions selected, fetch all three regions for comparison
      if (selectedRegion === "ALL") {
        try {
          const regions = ["MIEN_BAC", "MIEN_TRUNG", "MIEN_NAM"];
          const fetchPromises = regions.map(region =>
            fetch(`/api/price/${selectedProduct}?range=${selectedRange.value}&region=${region}`, {
              signal: controller.signal,
              cache: "no-store",
            }).then(async (response) => {
              if (!response.ok) return null;
              const payload: ApiPriceResponse = await response.json();
              return { region, data: payload };
            }).catch(() => null)
          );

          const results = await Promise.all(fetchPromises);
          if (!ignore) {
            const dataByRegion: Record<string, PricePoint[]> = {};
            const validResults = results.filter((r): r is { region: string; data: ApiPriceResponse } => r !== null);

            validResults.forEach(result => {
              dataByRegion[result.region] = result.data.points;
            });

            if (validResults.length > 0) {
              const firstValid = validResults[0];
              setSeriesMeta({
                code: firstValid.data.series.code,
                name: firstValid.data.series.name,
                unit: firstValid.data.series.unit,
                region: "ALL",
                product: selectedProduct,
              });
            }

            setComparisonData(dataByRegion);
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
        const response = await fetch(
          `/api/price/${selectedProduct}?range=${selectedRange.value}&region=${selectedRegion}`,
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
              region: selectedRegion,
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

        const payload: ApiPriceResponse = await response.json();
        if (!ignore) {
          setSeriesMeta({
            code: payload.series.code,
            name: payload.series.name,
            unit: payload.series.unit,
            region: payload.series.region,
            product: payload.series.product,
          });
          setData(payload.points);
          setComparisonData({});
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
  }, [selectedProduct, selectedRegion, selectedRange, seriesOptions]);

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
    Object.values(comparisonData).forEach(points => {
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

      Object.entries(comparisonData).forEach(([region, points]) => {
        const point = points.find(p => p.ts === ts);
        if (point) {
          dataPoint[region] = point.value;
        }
      });

      return dataPoint;
    });
  }, [comparisonData, selectedRange.value]);

  const tableData = useMemo(() => {
    if (selectedRegion === "ALL") {
      // Flatten all regions data for table display
      const allPoints: PricePoint[] = [];
      Object.entries(comparisonData).forEach(([region, points]) => {
        points.forEach(point => {
          allPoints.push({ ...point, region });
        });
      });
      return allPoints.sort((a, b) => b.ts.localeCompare(a.ts));
    }
    return data;
  }, [selectedRegion, comparisonData, data]);

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
            backgroundColor: "rgba(11,11,11,0.95)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "16px",
            color: "#f6f7f9",
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
    if (!regionOptions.includes(selectedRegion)) {
      setSelectedRegion(regionOptions[0] ?? "ALL");
    }
  }, [regionOptions, selectedRegion]);

  return (
    <div className="theme-panel space-y-4 md:space-y-6 rounded-2xl md:rounded-3xl border p-4 md:p-8 shadow-[0_40px_120px_rgba(0,0,0,0.45)] backdrop-blur">
      <div className="flex flex-col gap-3 md:gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.25em] md:tracking-[0.3em] text-[#f7c948]/70">Chọn dữ liệu</p>
          <h2 className="text-xl md:text-2xl lg:text-3xl font-serif text-[#f6f7f9]">
            {seriesMeta?.name ?? (seriesLoading ? "Đang tải..." : "Không có dữ liệu")}
          </h2>
          {seriesMeta?.unit ? (
            <p className="text-xs md:text-sm text-gray-400">
              Đơn vị: {seriesMeta.unit} · Vùng: {REGION_LABELS[seriesMeta.region] ?? seriesMeta.region}
            </p>
          ) : null}
        </div>
        <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2 md:gap-4">
          <label className="flex flex-col text-[10px] md:text-xs uppercase tracking-wide text-gray-400">
            Sản phẩm
            <select
              value={selectedProduct}
              onChange={(event) => {
                setSelectedProduct(event.target.value);
                setSelectedRegion("ALL");
              }}
              className="theme-field mt-1 w-full md:min-w-[160px] rounded-full border px-2 md:px-4 py-2 text-xs md:text-sm outline-none transition focus:border-[#f7c948]"
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

          <label className="flex flex-col text-[10px] md:text-xs uppercase tracking-wide text-gray-400">
            Vùng miền
            <select
              value={selectedRegion}
              onChange={(event) => setSelectedRegion(event.target.value)}
              className="theme-field mt-1 w-full md:min-w-[140px] rounded-full border px-2 md:px-4 py-2 text-xs md:text-sm outline-none transition focus:border-[#f7c948]"
              disabled={seriesLoading || !!seriesError}
            >
              {regionOptions.map((region) => (
                <option key={region} value={region} className="bg-white text-black dark:bg-[#0b0b0b] dark:text-white">
                  {REGION_LABELS[region] ?? region}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col text-[10px] md:text-xs uppercase tracking-wide text-gray-400">
            Thời gian
            <select
              value={selectedRange.value}
              onChange={(event) => {
                const option = rangeOptions.find(
                  (item) => item.value === Number(event.target.value)
                );
                if (option) {
                  setSelectedRange(option);
                }
              }}
              className="theme-field mt-1 w-full md:min-w-[140px] rounded-full border px-2 md:px-4 py-2 text-xs md:text-sm outline-none transition focus:border-[#f7c948]"
            >
              {rangeOptions.map((option) => (
                <option key={option.value} value={option.value} className="bg-white text-black dark:bg-[#0b0b0b] dark:text-white">
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col text-[10px] md:text-xs uppercase tracking-wide text-gray-400">
            Biểu đồ
            <select
              value={chartType}
              onChange={(event) => setChartType(event.target.value as ChartType)}
              className="theme-field mt-1 w-full md:min-w-[140px] rounded-full border px-2 md:px-4 py-2 text-xs md:text-sm outline-none transition focus:border-[#f7c948]"
            >
              {chartTypeOptions.map((option) => (
                <option key={option.value} value={option.value} className="bg-white text-black dark:bg-[#0b0b0b] dark:text-white">
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="h-[280px] md:h-[340px] w-full">
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
        ) : (selectedRegion === "ALL" ? comparisonChartData.length === 0 : chartData.length === 0) ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            Chưa có dữ liệu cho lựa chọn này.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "line" ? (
              selectedRegion === "ALL" ? (
                <LineChart data={comparisonChartData}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="dateLabel"
                    stroke="#d1d5db"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                  />
                  <YAxis
                    stroke="#d1d5db"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    tickFormatter={(value: number) => Intl.NumberFormat("vi-VN").format(value / 1000) + "k"}
                  />
                  <Tooltip cursor={{ stroke: "rgba(247,201,72,0.35)", strokeWidth: 1.5 }} />
                  <Legend
                    wrapperStyle={{ paddingTop: "20px" }}
                    iconType="line"
                    formatter={(value) => <span style={{ color: "#d1d5db", fontSize: 12 }}>{REGION_LABELS[value as string] ?? value}</span>}
                  />
                  <Line
                    type="monotone"
                    dataKey="MIEN_BAC"
                    stroke="#f7c948"
                    strokeWidth={2.5}
                    dot={false}
                    name="MIEN_BAC"
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="MIEN_TRUNG"
                    stroke="#b30d0d"
                    strokeWidth={2.5}
                    dot={false}
                    name="MIEN_TRUNG"
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="MIEN_NAM"
                    stroke="#60a5fa"
                    strokeWidth={2.5}
                    dot={false}
                    name="MIEN_NAM"
                    connectNulls
                  />
                </LineChart>
              ) : (
                <LineChart data={chartData}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="dateLabel"
                    stroke="#d1d5db"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                  />
                  <YAxis
                    stroke="#d1d5db"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    tickFormatter={(value: number) => Intl.NumberFormat("vi-VN").format(value / 1000) + "k"}
                  />
                  <Tooltip
                    cursor={{ stroke: "rgba(247,201,72,0.35)", strokeWidth: 1.5 }}
                    content={<CustomTooltip />}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#f7c948"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 6, strokeWidth: 0, fill: "#b30d0d" }}
                  />
                </LineChart>
              )
            ) : chartType === "area" ? (
              selectedRegion === "ALL" ? (
                <AreaChart data={comparisonChartData}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="dateLabel"
                    stroke="#d1d5db"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                  />
                  <YAxis
                    stroke="#d1d5db"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    tickFormatter={(value: number) => Intl.NumberFormat("vi-VN").format(value / 1000) + "k"}
                  />
                  <Tooltip cursor={{ stroke: "rgba(247,201,72,0.35)", strokeWidth: 1.5 }} />
                  <Legend
                    wrapperStyle={{ paddingTop: "20px" }}
                    iconType="rect"
                    formatter={(value) => <span style={{ color: "#d1d5db", fontSize: 12 }}>{REGION_LABELS[value as string] ?? value}</span>}
                  />
                  <defs>
                    <linearGradient id="colorMienBac" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f7c948" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#f7c948" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="colorMienTrung" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#b30d0d" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#b30d0d" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="colorMienNam" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="MIEN_BAC"
                    stroke="#f7c948"
                    strokeWidth={2.5}
                    fill="url(#colorMienBac)"
                    fillOpacity={0.6}
                    name="MIEN_BAC"
                    connectNulls
                  />
                  <Area
                    type="monotone"
                    dataKey="MIEN_TRUNG"
                    stroke="#b30d0d"
                    strokeWidth={2.5}
                    fill="url(#colorMienTrung)"
                    fillOpacity={0.6}
                    name="MIEN_TRUNG"
                    connectNulls
                  />
                  <Area
                    type="monotone"
                    dataKey="MIEN_NAM"
                    stroke="#60a5fa"
                    strokeWidth={2.5}
                    fill="url(#colorMienNam)"
                    fillOpacity={0.6}
                    name="MIEN_NAM"
                    connectNulls
                  />
                </AreaChart>
              ) : (
                <AreaChart data={chartData}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="dateLabel"
                    stroke="#d1d5db"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                  />
                  <YAxis
                    stroke="#d1d5db"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    tickFormatter={(value: number) => Intl.NumberFormat("vi-VN").format(value / 1000) + "k"}
                  />
                  <Tooltip
                    cursor={{ stroke: "rgba(247,201,72,0.35)", strokeWidth: 1.5 }}
                    content={<CustomTooltip />}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#f7c948"
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
              selectedRegion === "ALL" ? (
                <BarChart data={comparisonChartData}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="dateLabel"
                    stroke="#d1d5db"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                  />
                  <YAxis
                    stroke="#d1d5db"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    tickFormatter={(value: number) => Intl.NumberFormat("vi-VN").format(value / 1000) + "k"}
                  />
                  <Tooltip cursor={{ fill: "rgba(247,201,72,0.1)" }} />
                  <Legend
                    wrapperStyle={{ paddingTop: "20px" }}
                    iconType="rect"
                    formatter={(value) => <span style={{ color: "#d1d5db", fontSize: 12 }}>{REGION_LABELS[value as string] ?? value}</span>}
                  />
                  <Bar
                    dataKey="MIEN_BAC"
                    fill="#f7c948"
                    radius={[8, 8, 0, 0]}
                    name="MIEN_BAC"
                  />
                  <Bar
                    dataKey="MIEN_TRUNG"
                    fill="#b30d0d"
                    radius={[8, 8, 0, 0]}
                    name="MIEN_TRUNG"
                  />
                  <Bar
                    dataKey="MIEN_NAM"
                    fill="#60a5fa"
                    radius={[8, 8, 0, 0]}
                    name="MIEN_NAM"
                  />
                </BarChart>
              ) : (
                <BarChart data={chartData}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="dateLabel"
                    stroke="#d1d5db"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                  />
                  <YAxis
                    stroke="#d1d5db"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    tickFormatter={(value: number) => Intl.NumberFormat("vi-VN").format(value / 1000) + "k"}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(247,201,72,0.1)" }}
                    content={<CustomTooltip />}
                  />
                  <Bar
                    dataKey="value"
                    fill="#f7c948"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              )
            )}
          </ResponsiveContainer>
        )}
      </div>

      <PriceTable
        series={seriesMeta ? { code: seriesMeta.code, name: seriesMeta.name, unit: seriesMeta.unit } : null}
        rangeLabel={`${selectedRange.value} ngày`}
        data={tableData}
        loading={loading}
        error={error ?? seriesError}
        regionLabel={seriesMeta ? REGION_LABELS[seriesMeta.region] ?? seriesMeta.region : undefined}
        regionValue={seriesMeta?.region}
      />
    </div>
  );
}

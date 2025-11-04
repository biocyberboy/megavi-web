import type { Metadata } from "next";

import PriceDashboardTabs from "@/components/PriceDashboardTabs";
import { getLatestPriceSnapshot, getPricePointsForProduct, getSeriesWithRegions } from "@/lib/data/price";

type InitialPoint = { ts: string; value: number; source: string | null; region?: string };

export const metadata: Metadata = {
  title: "Bảng giá gia cầm – MEGAVI Official",
  description: "Theo dõi biểu đồ giá gia cầm Việt Nam với dữ liệu giả lập từ MEGAVI.",
};

const DEFAULT_RANGE_DAYS = 7;
const DEFAULT_REGION = "ALL";

export default async function PriceDashboardPage() {
  const seriesOptions = await getSeriesWithRegions();
  const defaultProduct = seriesOptions[0]?.product ?? "";

  let initialSeriesMeta: {
    code: string;
    name: string;
    unit: string;
    region: string;
    product: string;
  } | null = null;
  let initialComparisonData: Record<string, InitialPoint[]> = {};
  let initialData: InitialPoint[] = [];
  let latestSnapshot = await getLatestPriceSnapshot();

  if (defaultProduct) {
    const initialPayload = await getPricePointsForProduct(defaultProduct, DEFAULT_REGION, DEFAULT_RANGE_DAYS);
    if (initialPayload) {
      initialSeriesMeta = initialPayload.meta;
      if (initialPayload.dataByRegion) {
        initialComparisonData = initialPayload.dataByRegion;
      } else if (initialPayload.data) {
        initialData = initialPayload.data;
      }
    }
  }

  return (
    <main className="theme-surface min-h-screen px-4 md:px-6 pb-16 md:pb-24 pt-24 md:pt-32">
      <div className="mx-auto max-w-5xl space-y-8 md:space-y-12">
        <header className="text-center px-2">
          <p className="text-xs uppercase tracking-[0.25em] md:tracking-[0.35em] text-[#f7c948]/70">BẢNG GIÁ</p>
          <h1 className="mt-3 md:mt-4 text-2xl md:text-4xl lg:text-6xl font-serif text-[#f6f7f9]">
            Giá Gia Cầm Việt Nam
          </h1>
          <p className="mt-3 md:mt-4 text-xs md:text-sm lg:text-base text-gray-300">
            Dữ liệu cập nhật liên tục, phản ánh xu hướng giá gia cầm toàn quốc.
          </p>
        </header>

        <PriceDashboardTabs
          initialSeriesOptions={seriesOptions}
          initialProduct={defaultProduct}
          initialRegion={DEFAULT_REGION}
          initialRangeDays={DEFAULT_RANGE_DAYS}
          initialSeriesMeta={initialSeriesMeta}
          initialComparisonData={initialComparisonData}
          initialData={initialData}
          initialSnapshot={latestSnapshot}
        />
      </div>
    </main>
  );
}

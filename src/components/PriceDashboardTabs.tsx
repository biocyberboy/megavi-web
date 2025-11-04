"use client";

import { useState } from "react";

import LatestPriceSnapshotPanel from "@/components/LatestPriceSnapshot";
import PriceChart from "@/components/PriceChart";
import type { LatestPriceSnapshot } from "@/lib/data/price";

type SeriesOption = {
  id: string;
  code: string;
  name: string;
  product: string;
  regions: string[];
  unit: string;
};

type PriceDashboardTabsProps = {
  initialSeriesOptions: SeriesOption[];
  initialProduct: string;
  initialRegion: string;
  initialRangeDays: number;
  initialSeriesMeta: any;
  initialComparisonData: Record<string, any>;
  initialData: any[];
  initialSnapshot: LatestPriceSnapshot[];
};

export default function PriceDashboardTabs({
  initialSeriesOptions,
  initialProduct,
  initialRegion,
  initialRangeDays,
  initialSeriesMeta,
  initialComparisonData,
  initialData,
  initialSnapshot,
}: PriceDashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<"chart" | "latest">("latest");

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1 text-xs text-gray-300">
        <button
          type="button"
          onClick={() => setActiveTab("latest")}
          className={`rounded-full px-4 py-1.5 font-medium transition ${
            activeTab === "latest"
              ? "bg-[#f7c948] text-black shadow-[0_4px_14px_rgba(247,201,72,0.35)]"
              : "hover:text-white"
          }`}
        >
          Bảng giá mới nhất
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("chart")}
          className={`rounded-full px-4 py-1.5 font-medium transition ${
            activeTab === "chart"
              ? "bg-[#f7c948] text-black shadow-[0_4px_14px_rgba(247,201,72,0.35)]"
              : "hover:text-white"
          }`}
        >
          Khung thời gian
        </button>
      </div>

      {activeTab === "chart" ? (
        <PriceChart
          initialSeriesOptions={initialSeriesOptions}
          initialProduct={initialProduct}
          initialRegion={initialRegion}
          initialRangeDays={initialRangeDays}
          initialSeriesMeta={initialSeriesMeta}
          initialComparisonData={initialComparisonData}
          initialData={initialData}
        />
      ) : (
        <LatestPriceSnapshotPanel initialData={initialSnapshot} />
      )}
    </div>
  );
}

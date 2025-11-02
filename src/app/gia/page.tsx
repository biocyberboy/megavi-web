import type { Metadata } from "next";

import PriceChart from "@/components/PriceChart";

export const metadata: Metadata = {
  title: "Bảng giá gia cầm – MEGAVI Official",
  description: "Theo dõi biểu đồ giá gia cầm Việt Nam với dữ liệu giả lập từ MEGAVI.",
};

export default function PriceDashboardPage() {
  return (
    <main className="theme-surface min-h-screen px-4 md:px-6 pb-16 md:pb-24 pt-24 md:pt-32">
      <div className="mx-auto max-w-5xl space-y-8 md:space-y-12">
        <header className="text-center px-2">
          <p className="text-xs uppercase tracking-[0.25em] md:tracking-[0.35em] text-[#f7c948]/70">BẢNG GIÁ</p>
          <h1 className="mt-3 md:mt-4 text-2xl md:text-4xl lg:text-6xl font-serif text-[#f6f7f9]">
            📊 Biểu đồ Giá Gia Cầm Việt Nam
          </h1>
          <p className="mt-3 md:mt-4 text-xs md:text-sm lg:text-base text-gray-300">
            Chọn chủng loại và khung thời gian để xem diễn biến giá trung bình toàn thị trường. Dữ liệu
            là giả lập phục vụ thiết kế giao diện.
          </p>
        </header>

        <PriceChart />
      </div>
    </main>
  );
}

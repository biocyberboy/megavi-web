"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import type { ActionState } from "./actions";
import { createPricePoint } from "./actions";
import { REGION_KEYS, normalizeRegion } from "@/lib/seriesCode";

const initialState: ActionState = { success: false, message: "" };

type SeriesOption = {
  id: string;
  name: string;
  code: string;
  unit: string;
  product: string;
  regions: string[];
};

function SubmitButton({ label, disabled }: { label: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="rounded-full bg-[#f7c948] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#f7c948]/80 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending || disabled}
    >
      {pending ? "Đang lưu..." : label}
    </button>
  );
}

const REGION_LABELS: Record<string, string> = {
  MIEN_BAC: "Miền Bắc",
  MIEN_TRUNG: "Miền Trung",
  MIEN_NAM: "Miền Nam",
};

export default function PriceForm({ series }: { series: SeriesOption[] }) {
  const [state, formAction] = useFormState(createPricePoint, initialState);

  const productOptions = useMemo(() => {
    const map = new Map<string, { product: string; name: string }>();
    series.forEach((item) => {
      if (!map.has(item.product)) {
        map.set(item.product, { product: item.product, name: item.name });
      }
    });
    return Array.from(map.values());
  }, [series]);

  const [selectedProduct, setSelectedProduct] = useState(productOptions[0]?.product ?? "");

  const regionOptions = useMemo(() => {
    const matched = series.filter((item) => item.product === selectedProduct);
    const regions = new Set<string>(REGION_KEYS);
    matched.forEach((item) => {
      item.regions.forEach((region) => regions.add(normalizeRegion(region)));
    });
    return Array.from(regions);
  }, [series, selectedProduct]);

  const [selectedRegion, setSelectedRegion] = useState<string>(regionOptions[0] ?? "");

  useEffect(() => {
    if (regionOptions.length === 0) {
      setSelectedRegion("");
      return;
    }
    if (!regionOptions.includes(selectedRegion)) {
      setSelectedRegion(regionOptions[0] ?? "");
    }
  }, [regionOptions, selectedRegion]);

  const selectedSeries = useMemo(() => {
    return series.find((item) => item.product === selectedProduct) ?? null;
  }, [series, selectedProduct]);

  const selectedSeriesId = selectedSeries?.id ?? "";

  return (
    <form action={formAction} className="theme-panel space-y-4 rounded-3xl border p-6 shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
      <div>
        <h3 className="text-lg font-serif text-[#f6f7f9]">Cập nhật giá theo ngày</h3>
        <p className="mt-1 text-xs text-gray-400">Chọn series và nhập giá trị cho ngày tương ứng.</p>
      </div>

      {productOptions.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-yellow-400">
          Chưa có series nào. Hãy tạo series trước khi ghi nhận giá.
        </p>
      ) : null}

      <input type="hidden" name="seriesId" value={selectedSeriesId} />
      {selectedSeriesId === "" ? (
        <p className="text-xs text-red-400">Chưa có series cho lựa chọn này. Hãy thêm series trước.</p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <label className="flex flex-col gap-2 text-sm">
          Sản phẩm
          <select
            value={selectedProduct}
            onChange={(event) => {
              const next = event.target.value;
              setSelectedProduct(next);
              const match = series.find((item) => item.product === next);
              const firstRegion = match?.regions[0] ?? REGION_KEYS[0] ?? "";
              setSelectedRegion(firstRegion);
            }}
            className="theme-field rounded-2xl border px-4 py-2 text-sm outline-none transition focus:border-[#f7c948]"
          >
            {productOptions.map((option) => (
              <option key={option.product} value={option.product} className="bg-white text-black dark:bg-[#0b0b0b] dark:text-white">
                {option.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm">
          Vùng miền
          <select
            name="region"
            value={selectedRegion}
            onChange={(event) => setSelectedRegion(event.target.value)}
            className="theme-field rounded-2xl border px-4 py-2 text-sm outline-none transition focus:border-[#f7c948]"
          >
            {regionOptions.map((region) => (
              <option key={region} value={region} className="bg-white text-black dark:bg-[#0b0b0b] dark:text-white">
                {REGION_LABELS[normalizeRegion(region)] ?? region}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm">
          Đơn vị
          <input
            value={selectedSeries?.unit ?? ""}
            readOnly
            className="theme-field rounded-2xl border px-4 py-2 text-sm text-gray-400 outline-none"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          Ngày
          <input
            type="date"
            name="date"
            required
            className="theme-field rounded-2xl border px-4 py-2 text-sm outline-none transition focus:border-[#f7c948]"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          Giá trị
          <input
            type="number"
            step="0.01"
            name="value"
            required
            placeholder="30000"
            className="theme-field rounded-2xl border px-4 py-2 text-sm outline-none transition focus:border-[#f7c948]"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          Nguồn (tuỳ chọn)
          <input
            name="source"
            placeholder="Báo cáo nội bộ"
            className="theme-field rounded-2xl border px-4 py-2 text-sm outline-none transition focus:border-[#f7c948]"
          />
        </label>
      </div>

      <div className="flex items-center justify-between gap-3 text-sm">
        <span className={state.message ? (state.success ? "text-emerald-400" : "text-red-400") : "text-gray-400"}>
          {state.message || ""}
        </span>
        <SubmitButton label="Lưu giá" disabled={selectedSeriesId === ""} />
      </div>
    </form>
  );
}

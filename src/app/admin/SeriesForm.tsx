"use client";

import { useFormState, useFormStatus } from "react-dom";

import type { ActionState } from "./actions";
import { createSeries } from "./actions";

const initialState: ActionState = { success: false, message: "" };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="rounded-full bg-[#f7c948] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#f7c948]/80 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
    >
      {pending ? "Đang lưu..." : label}
    </button>
  );
}

export default function SeriesForm() {
  const [state, formAction] = useFormState(createSeries, initialState);

  return (
    <form action={formAction} className="theme-panel space-y-4 rounded-3xl border p-6 shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
      <div>
        <h3 className="text-lg font-serif text-[#f6f7f9]">Thêm Series mới</h3>
        <p className="mt-1 text-xs text-gray-400">Nhập mã sản phẩm (ví dụ GA_TRANG) và đơn vị hiển thị.</p>
      </div>

      <label className="flex flex-col gap-2 text-sm">
        Mã sản phẩm (slug)
        <input
          name="product"
          required
          placeholder="GA_TRANG"
          className="theme-field rounded-2xl border px-4 py-2 text-sm outline-none transition focus:border-[#f7c948]"
        />
      </label>

      <label className="flex flex-col gap-2 text-sm">
        Tên hiển thị
        <input
          name="name"
          required
          placeholder="Gà trắng"
          className="theme-field rounded-2xl border px-4 py-2 text-sm outline-none transition focus:border-[#f7c948]"
        />
      </label>

      <label className="flex flex-col gap-2 text-sm">
        Đơn vị
        <input
          name="unit"
          required
          placeholder="VND/kg"
          className="theme-field rounded-2xl border px-4 py-2 text-sm outline-none transition focus:border-[#f7c948]"
        />
      </label>

      <div className="flex items-center justify-between gap-3 text-sm">
        <span className={state.message ? (state.success ? "text-emerald-400" : "text-red-400") : "text-gray-400"}>
          {state.message || ""}
        </span>
        <SubmitButton label="Lưu series" />
      </div>
    </form>
  );
}

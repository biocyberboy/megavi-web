"use client";

import { useFormState, useFormStatus } from "react-dom";

import type { ActionState } from "./actions";
import { createBlogPost } from "./actions";

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

export default function BlogForm() {
  const [state, formAction] = useFormState(createBlogPost, initialState);

  return (
    <form action={formAction} className="theme-panel space-y-4 rounded-3xl border p-6 shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
      <div>
        <h3 className="text-lg font-serif text-[#f6f7f9]">Tạo / Cập nhật bài viết</h3>
        <p className="mt-1 text-xs text-gray-400">
          Nhập slug để cập nhật bài viết đã có. Để trống `Ngày xuất bản` nếu muốn lưu dạng draft.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          Slug
          <input
            name="slug"
            required
            placeholder="nhip-thi-truong"
            className="theme-field rounded-2xl border px-4 py-2 text-sm outline-none transition focus:border-[#f7c948]"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          Ngày xuất bản
          <input
            type="date"
            name="publishedAt"
            className="theme-field rounded-2xl border px-4 py-2 text-sm outline-none transition focus:border-[#f7c948]"
          />
        </label>
      </div>

      <label className="flex flex-col gap-2 text-sm">
        Tiêu đề
        <input
          name="title"
          required
          placeholder="Nhịp thị trường tuần 01"
          className="theme-field rounded-2xl border px-4 py-2 text-sm outline-none transition focus:border-[#f7c948]"
        />
      </label>

      <label className="flex flex-col gap-2 text-sm">
        Tóm tắt
        <textarea
          name="summary"
          rows={2}
          placeholder="Ghi nhận tín hiệu phục hồi..."
          className="theme-field rounded-2xl border px-4 py-2 text-sm outline-none transition focus:border-[#f7c948]"
        />
      </label>

      <label className="flex flex-col gap-2 text-sm">
        Ảnh minh hoạ (URL hoặc Data URI)
        <input
          name="coverImage"
          placeholder="https://... hoặc dán data:image/png;base64,..."
          className="theme-field rounded-2xl border px-4 py-2 text-sm outline-none transition focus:border-[#f7c948]"
        />
        <span className="text-xs text-gray-500">
          Hãy dán đường dẫn ảnh trực tiếp hoặc Data URI. Hệ thống sẽ dùng ảnh này làm hero cho bài viết.
        </span>
      </label>

      <label className="flex flex-col gap-2 text-sm">
        Nội dung Markdown
        <textarea
          name="bodyMd"
          required
          rows={8}
          placeholder="# Tiêu đề lớn\n\nNội dung bài viết..."
          className="theme-field rounded-2xl border px-4 py-2 text-sm outline-none transition focus:border-[#f7c948]"
        />
      </label>

      <div className="flex items-center justify-between gap-3 text-sm">
        <span className={state.message ? (state.success ? "text-emerald-400" : "text-red-400") : "text-gray-400"}>
          {state.message || ""}
        </span>
        <SubmitButton label="Lưu bài viết" />
      </div>
    </form>
  );
}

"use client";

import { useCallback, useRef, useState } from "react";
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

const SUPPORTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

const createReferenceId = () => `img-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;

export default function BlogForm() {
  const [state, formAction] = useFormState(createBlogPost, initialState);
  const [bodyValue, setBodyValue] = useState("");
  const [helperMessage, setHelperMessage] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const insertAtCursor = useCallback((value: string) => {
    setBodyValue((prev) => {
      const textarea = textareaRef.current;
      if (!textarea) {
        return `${prev}${value}`;
      }

      const { selectionStart = prev.length, selectionEnd = prev.length } = textarea;
      const next = prev.slice(0, selectionStart) + value + prev.slice(selectionEnd);

      requestAnimationFrame(() => {
        textarea.focus();
        const cursor = selectionStart + value.length;
        textarea.setSelectionRange(cursor, cursor);
      });

      return next;
    });
  }, []);

  const insertImageWithReference = useCallback(
    (source: string) => {
      const referenceId = createReferenceId();
      const imageMarkdown = `![Ảnh minh hoạ][${referenceId}]`;
      setBodyValue((prev) => {
        const textarea = textareaRef.current;
        if (!textarea) {
          return `${prev}\n\n${imageMarkdown}\n\n[${referenceId}]: ${source}`;
        }

        const { selectionStart = prev.length, selectionEnd = prev.length } = textarea;
        const before = prev.slice(0, selectionStart);
        const after = prev.slice(selectionEnd);
        const insertion = `\n\n${imageMarkdown}\n\n`;
        let nextBody = `${before}${insertion}${after}`;

        const trimmed = nextBody.replace(/\s+$/g, "");
        const definitionLine = `[${referenceId}]: ${source}`;

        if (trimmed.length === 0) {
          nextBody = `${imageMarkdown}\n\n${definitionLine}`;
        } else {
          nextBody = `${trimmed}\n\n${definitionLine}`;
        }

        requestAnimationFrame(() => {
          textarea.focus();
          const cursor = before.length + insertion.length;
          textarea.setSelectionRange(cursor, cursor);
        });

        return nextBody;
      });
      setHelperMessage("Đã chèn ảnh. Định nghĩa ảnh được thêm ở cuối bài.");
    },
    []
  );

  const handleInsertImageUrl = useCallback(() => {
    const url = window.prompt("Dán đường dẫn ảnh (https:// hoặc data:image/...):");
    if (!url) {
      return;
    }
    const trimmed = url.trim();
    if (!trimmed) {
      return;
    }
    insertImageWithReference(trimmed);
  }, [insertImageWithReference]);

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Không thể đọc dữ liệu ảnh."));
        }
      };
      reader.onerror = () => reject(new Error("Không thể đọc dữ liệu ảnh."));
      reader.readAsDataURL(file);
    });

  const handleInsertFile = useCallback(
    async (file: File) => {
      if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
        setHelperMessage("Định dạng ảnh không được hỗ trợ. Hãy dùng PNG, JPG, WEBP hoặc GIF.");
        return;
      }
      try {
        const dataUrl = await readFileAsDataUrl(file);
        insertImageWithReference(dataUrl);
      } catch (error) {
        console.error("[blog-form] insert file", error);
        setHelperMessage("Không thể tải ảnh. Vui lòng thử lại.");
      }
    },
    [insertImageWithReference]
  );

  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }
      void handleInsertFile(file);
      event.target.value = "";
    },
    [handleInsertFile]
  );

  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = event.clipboardData?.items;
      if (!items) {
        return;
      }

      const imageItem = Array.from(items).find((item) => item.type.startsWith("image/"));
      if (!imageItem) {
        return;
      }

      const file = imageItem.getAsFile();
      if (!file) {
        return;
      }

      event.preventDefault();
      void handleInsertFile(file);
    },
    [handleInsertFile]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLTextAreaElement>) => {
      event.preventDefault();
      const file = event.dataTransfer.files?.[0];
      if (file) {
        void handleInsertFile(file);
      }
    },
    [handleInsertFile]
  );

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
          Hệ thống dùng ảnh này làm hero của bài viết. Bạn có thể dán URL trực tiếp hoặc Data URI.
        </span>
      </label>

      <div className="flex flex-col gap-2 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>Nội dung Markdown</span>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full border border-white/20 px-3 py-1 text-xs text-gray-200 transition hover:border-[#f7c948] hover:text-[#f7c948]"
            >
              Tải ảnh từ máy
            </button>
            <button
              type="button"
              onClick={handleInsertImageUrl}
              className="rounded-full border border-white/20 px-3 py-1 text-xs text-gray-200 transition hover:border-[#f7c948] hover:text-[#f7c948]"
            >
              Chèn ảnh từ URL
            </button>
            <span className="text-[10px] text-gray-500">
              Có thể dán ảnh trực tiếp hoặc kéo thả vào khung soạn thảo.
            </span>
          </div>
        </div>
        <textarea
          ref={textareaRef}
          name="bodyMd"
          required
          rows={12}
          value={bodyValue}
          onChange={(event) => setBodyValue(event.target.value)}
          onPaste={handlePaste}
          onDrop={handleDrop}
          onDragOver={(event) => event.preventDefault()}
          placeholder="# Tiêu đề lớn\n\nNội dung bài viết..."
          className="theme-field rounded-2xl border px-4 py-2 text-sm outline-none transition focus:border-[#f7c948] min-h-[240px]"
        />
        {helperMessage ? <span className="text-xs text-gray-400">{helperMessage}</span> : null}
        <span className="text-[10px] text-gray-500">
          Mẹo: thêm <code>|small</code>, <code>|large</code> hoặc <code>|full</code> vào sau chữ mô tả trong cú pháp
          <code> ![caption|large][ref]</code> để điều chỉnh kích thước ảnh. Các định nghĩa ảnh nằm ở cuối nội dung, bạn có
          thể sắp xếp lại nếu cần.
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={handleFileInputChange}
        />
      </div>

      <div className="flex items-center justify-between gap-3 text-sm">
        <span className={state.message ? (state.success ? "text-emerald-400" : "text-red-400") : "text-gray-400"}>
          {state.message || helperMessage || ""}
        </span>
        <SubmitButton label="Lưu bài viết" />
      </div>
    </form>
  );
}

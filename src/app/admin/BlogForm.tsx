"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import type { ActionState } from "./actions";
import { createBlogPost } from "./actions";

const initialState: ActionState = { success: false, message: "" };

const SUPPORTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const CKEDITOR_SCRIPT_URL = "https://cdn.ckeditor.com/4.25.1-lts/standard-all/ckeditor.js";

type CKEditorInstance = {
  destroy: () => void;
  setData: (data: string) => void;
  getData: () => string;
  updateElement: () => void;
  focus: () => void;
  insertHtml: (html: string) => void;
  on: (event: string, callback: () => void) => void;
  fire: (event: string) => void;
};

declare global {
  interface Window {
    CKEDITOR?: {
      replace: (element: HTMLTextAreaElement, config?: Record<string, unknown>) => CKEditorInstance;
    };
  }
}

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
  const [bodyValue, setBodyValue] = useState("");
  const [helperMessage, setHelperMessage] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const editorRef = useRef<CKEditorInstance | null>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  // Generate slug from title
  const generateSlug = (text: string): string => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
      .replace(/đ/g, "d")
      .replace(/Đ/g, "d")
      .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
      .trim()
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-"); // Remove duplicate hyphens
  };

  // Auto-generate slug when title changes (if slug hasn't been manually edited)
  useEffect(() => {
    if (!isSlugManuallyEdited && title) {
      setSlug(generateSlug(title));
    }
  }, [title, isSlugManuallyEdited]);

  const syncEditorData = useCallback((editor: CKEditorInstance) => {
    const data = editor.getData();
    setBodyValue(data);
    editor.updateElement();
  }, []);

  const initializeEditor = useCallback(() => {
    if (!textareaRef.current || !window.CKEDITOR || editorRef.current) {
      return;
    }

    const instance = window.CKEDITOR.replace(textareaRef.current, {
      removePlugins: "elementspath",
      extraPlugins: "autogrow",
      autoGrow_minHeight: 280,
      autoGrow_maxHeight: 600,
      autoGrow_bottomSpace: 24,
      toolbar: [
        { name: "clipboard", items: ["Undo", "Redo"] },
        { name: "styles", items: ["Format", "FontSize"] },
        { name: "basicstyles", items: ["Bold", "Italic", "Underline", "RemoveFormat"] },
        { name: "paragraph", items: ["NumberedList", "BulletedList", "Blockquote"] },
        { name: "insert", items: ["Image", "Table", "HorizontalRule"] },
        { name: "links", items: ["Link", "Unlink"] },
        { name: "tools", items: ["Maximize"] },
      ],
    });

    editorRef.current = instance;

    instance.on("instanceReady", () => {
      const initialData = textareaRef.current?.value ?? "";
      setBodyValue(initialData);
      instance.setData(initialData);
    });

    instance.on("change", () => {
      syncEditorData(instance);
    });
  }, [syncEditorData]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (window.CKEDITOR) {
      initializeEditor();
      return;
    }

    if (!scriptRef.current) {
      const script = document.createElement("script");
      script.src = CKEDITOR_SCRIPT_URL;
      script.onload = initializeEditor;
      script.onerror = () => {
        setHelperMessage("Không tải được CKEditor. Vui lòng kiểm tra kết nối.");
      };
      document.body.appendChild(script);
      scriptRef.current = script;
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
      if (scriptRef.current) {
        scriptRef.current.onload = null;
        scriptRef.current.onerror = null;
      }
    };
  }, [initializeEditor]);

  useEffect(() => {
    if (textareaRef.current && textareaRef.current.value !== bodyValue) {
      textareaRef.current.value = bodyValue;
    }
  }, [bodyValue]);


  return (
    <form action={formAction} className="theme-panel space-y-4 rounded-3xl border p-6 shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
      <div>
        <h3 className="text-lg font-serif text-[#f6f7f9]">Tạo / Cập nhật bài viết</h3>
        <p className="mt-1 text-xs text-gray-400">
          Slug tự động tạo từ tiêu đề. Để trống `Ngày xuất bản` nếu muốn lưu dạng draft.
        </p>
      </div>

      <label className="flex flex-col gap-2 text-sm">
        Tiêu đề
        <input
          name="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nhịp thị trường tuần 01"
          className="theme-field rounded-2xl border px-4 py-2 text-sm outline-none transition focus:border-[#f7c948]"
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          Slug
          <input
            name="slug"
            required
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setIsSlugManuallyEdited(true);
            }}
            placeholder="nhip-thi-truong-tuan-01"
            className="theme-field rounded-2xl border px-4 py-2 text-sm outline-none transition focus:border-[#f7c948]"
          />
          <span className="text-xs text-gray-500">
            Tự động tạo từ tiêu đề. Bạn có thể chỉnh sửa thủ công nếu cần.
          </span>
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
        <label>
          Nội dung bài viết
          <span className="ml-2 text-xs text-gray-500">(Dùng toolbar của CKEditor để chèn ảnh, table, link...)</span>
        </label>
        <textarea
          ref={textareaRef}
          name="bodyMd"
          required
          rows={12}
          onChange={(event) => setBodyValue(event.target.value)}
          placeholder="Nội dung bài viết..."
          className="theme-field rounded-2xl border px-4 py-2 text-sm outline-none transition focus:border-[#f7c948]"
        />
        {helperMessage ? <span className="text-xs text-gray-400">{helperMessage}</span> : null}
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

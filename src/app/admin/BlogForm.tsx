"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import type { ActionState } from "./actions";
import { createBlogPost } from "./actions";

const initialState: ActionState = { success: false, message: "" };

const SUPPORTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const CKEDITOR_SCRIPT_URL = "https://cdn.ckeditor.com/4.22.1/standard-all/ckeditor.js";

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

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editorRef = useRef<CKEditorInstance | null>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

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

  const insertImageIntoEditor = useCallback(
    (source: string) => {
      const trimmed = source.trim();
      if (!trimmed) {
        return;
      }

      const editor = editorRef.current;
      if (editor) {
        editor.focus();
        editor.fire("saveSnapshot");
        editor.insertHtml(
          `<p><img src="${trimmed}" alt="Ảnh minh hoạ" style="max-width:100%; height:auto;" /></p>`
        );
        editor.fire("saveSnapshot");
        syncEditorData(editor);
        setHelperMessage("Đã chèn ảnh vào nội dung.");
        return;
      }

      if (textareaRef.current) {
        const fallbackHtml = `${bodyValue}<p><img src="${trimmed}" alt="Ảnh minh hoạ" style="max-width:100%; height:auto;" /></p>`;
        textareaRef.current.value = fallbackHtml;
        setBodyValue(fallbackHtml);
        setHelperMessage("Đã chèn ảnh vào nội dung.");
      }
    },
    [bodyValue, syncEditorData]
  );

  const handleInsertImageUrl = useCallback(() => {
    const url = window.prompt("Dán đường dẫn ảnh (https:// hoặc data:image/...):");
    if (!url) {
      return;
    }
    insertImageIntoEditor(url);
  }, [insertImageIntoEditor]);

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
        insertImageIntoEditor(dataUrl);
      } catch (error) {
        console.error("[blog-form] insert file", error);
        setHelperMessage("Không thể tải ảnh. Vui lòng thử lại.");
      }
    },
    [insertImageIntoEditor]
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
          <span>Nội dung bài viết</span>
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
              Có thể kéo thả hoặc dán ảnh trực tiếp vào khung soạn thảo.
            </span>
          </div>
        </div>
        <textarea
          ref={textareaRef}
          name="bodyMd"
          required
          rows={12}
          onChange={(event) => setBodyValue(event.target.value)}
          onPaste={handlePaste}
          onDrop={handleDrop}
          onDragOver={(event) => event.preventDefault()}
          placeholder="Nội dung bài viết..."
          className="theme-field rounded-2xl border px-4 py-2 text-sm outline-none transition focus:border-[#f7c948]"
        />
        {helperMessage ? <span className="text-xs text-gray-400">{helperMessage}</span> : null}
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

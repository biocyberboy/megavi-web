"use client";

import { useFormStatus } from "react-dom";
import { useState } from "react";

type DeleteButtonProps = {
  label?: string;
  confirmMessage: string;
  itemName?: string;
};

function DeleteButtonInner({ label = "Xoá", confirmMessage, itemName }: DeleteButtonProps) {
  const { pending } = useFormStatus();
  const [showConfirm, setShowConfirm] = useState(false);

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowConfirm(false)}
          disabled={pending}
          className="rounded-full border border-white/20 px-3 py-1 text-[10px] text-gray-300 transition hover:border-gray-400 hover:text-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Huỷ
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex items-center gap-1.5 rounded-full border border-red-400 bg-red-500/20 px-3 py-1 text-[10px] text-red-400 transition hover:bg-red-500/30 disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? (
            <>
              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Đang xoá...
            </>
          ) : (
            "Xác nhận"
          )}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setShowConfirm(true)}
      className="rounded-full border border-white/20 px-3 py-1 text-[10px] text-gray-300 transition hover:border-red-400 hover:text-red-400"
      title={confirmMessage}
    >
      {label}
    </button>
  );
}

export default function DeleteButton({ label, confirmMessage, itemName }: DeleteButtonProps) {
  return <DeleteButtonInner label={label} confirmMessage={confirmMessage} itemName={itemName} />;
}

"use client";

import { useState } from "react";

const STORAGE_KEY = "megavi-admin-pass";

export default function PasscodeGate({ onSuccess }: { onSuccess: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: code.trim() }),
      });

      const data = await response.json();

      if (data.valid) {
        try {
          window.sessionStorage.setItem(STORAGE_KEY, "ok");
        } catch {
          // ignore
        }
        onSuccess();
      } else {
        setError("Sai mật khẩu bảo vệ");
      }
    } catch {
      setError("Không thể xác thực. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur">
      <form
        onSubmit={handleSubmit}
        className="theme-panel space-y-4 rounded-3xl border p-8 shadow-[0_40px_120px_rgba(0,0,0,0.45)]"
      >
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#f7c948]/70">Admin gate</p>
          <h1 className="mt-3 text-2xl font-serif text-[#f6f7f9]">Nhập mật khẩu bảo vệ</h1>
          <p className="mt-2 text-sm text-gray-400">
            Vui lòng nhập mật khẩu trước khi truy cập bảng điều khiển.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <label htmlFor="admin-pass" className="text-sm text-gray-300">
            Mật khẩu
          </label>
          <input
            id="admin-pass"
            type="password"
            autoComplete="current-password"
            className="theme-field rounded-2xl border px-4 py-2 text-sm outline-none transition focus:border-[#f7c948]"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="••••••••"
            required
          />
        </div>
        {error ? <p className="text-sm text-red-400">{error}</p> : <p className="text-xs text-gray-400">Mật khẩu bảo vệ MEGAVI Admin.</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-[#f7c948] px-5 py-2 text-sm font-semibold text-black transition hover:bg-[#f7c948]/80 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Đang xác thực..." : "Truy cập"}
        </button>
      </form>
    </div>
  );
}

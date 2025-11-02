"use client";

import { useTheme } from "@/components/ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  const buttonClass = isDark
    ? "border-white/20 bg-white/10 text-white hover:border-[#f7c948] hover:text-[#f7c948]"
    : "border-black/10 bg-black/5 text-black hover:border-[#b30d0d] hover:text-[#b30d0d]";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
      className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition ${buttonClass}`}
    >
      {isDark ? "🌞 Light" : "🌙 Dark"}
    </button>
  );
}

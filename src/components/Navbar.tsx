'use client';

import ThemeToggle from "@/components/ThemeToggle";
import { useTheme } from "@/components/ThemeProvider";

export default function Navbar() {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const navClass = isLight
    ? "border border-black/10 bg-white/80 text-black shadow-md"
    : "border border-white/10 bg-white/10 text-white";

  const handleSubscribeClick = () => {
    window.alert("Chức năng đăng ký sắp ra mắt!");
  };

  return (
    <header className="fixed inset-x-0 top-0 z-20">
      <nav
        className={`mx-auto mt-4 flex w-fit items-center gap-4 rounded-full px-4 py-2 backdrop-blur-md ${navClass}`}
      >
        <ul className="flex items-center gap-4 text-sm">
          <li>
            <a href="/#about">Giới thiệu</a>
          </li>
          <li>
            <a href="/blog">Bản tin</a>
          </li>
          <li>
            <a href="/gia">Bảng giá</a>
          </li>
          <li>
            <button
              type="button"
              onClick={handleSubscribeClick}
              className="bg-transparent p-0 text-current transition hover:text-[#f7c948] focus:outline-none"
            >
              Đăng ký
            </button>
          </li>
        </ul>
        <ThemeToggle />
      </nav>
    </header>
  );
}

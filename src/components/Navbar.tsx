'use client';

import ThemeToggle from "@/components/ThemeToggle";
import { useTheme } from "@/components/ThemeProvider";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const pathname = usePathname();

  const navClass = isLight
    ? "border border-black/10 bg-white/80 text-black shadow-md"
    : "border border-white/10 bg-white/10 text-white";

  const handleSubscribeClick = () => {
    window.alert("Chức năng đăng ký sắp ra mắt!");
  };

  const links = [
    {
      label: "Giới thiệu",
      href: "/#about",
      isActive: pathname === "/",
    },
    {
      label: "Bản tin",
      href: "/blog",
      isActive: pathname.startsWith("/blog"),
    },
    {
      label: "Bảng giá",
      href: "/gia",
      isActive: pathname.startsWith("/gia"),
    },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-20">
      <nav
        className={`mx-auto mt-4 flex w-fit items-center gap-4 rounded-full px-4 py-2 backdrop-blur-md ${navClass}`}
      >
        <ul className="flex items-center gap-4 text-sm">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className={`transition hover:text-[#f7c948] ${
                  link.isActive ? "text-[#f7c948]" : ""
                }`}
              >
                {link.label}
              </a>
            </li>
          ))}
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

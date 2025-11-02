import Link from "next/link";

type ContactItem = {
  label: string;
  href: string;
  display?: string;
};

const CONTACT_LINKS: ContactItem[] = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/profile.php?id=61582052737567",
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@nongtraihoakieu",
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@megaviinsight",
  },
  {
    label: "Zalo",
    href: "https://zalo.me/0846770106",
  },
  {
    label: "Mail",
    href: "mailto:lienhe@megavi.space",
    display: "lienhe@megavi.space",
  },
];

export default function Footer() {
  return (
    <footer className="theme-footer mt-24 border-t border-white/10 bg-black/40 py-12 text-sm text-gray-300 transition-colors duration-300">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm space-y-4">
          <p className="text-xs uppercase tracking-[0.35em] text-[#f7c948]/70">MEGAVI</p>
        </div>

        <div className="flex flex-col gap-4 text-sm text-gray-300 data-[theme=light]:text-gray-700">
          <p className="text-xs uppercase tracking-[0.3em] text-[#f7c948]/70">Kết nối</p>
          <div className="flex flex-wrap gap-2">
            {CONTACT_LINKS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                prefetch={false}
                className="contact-link inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-[#f7c948]/70 hover:text-[#f7c948]"
              >
                <span>{item.label}</span>
                {item.display ? (
                  <span className="text-xs font-normal text-gray-400 transition">
                    {item.display}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="theme-footer-copy mt-10 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} MEGAVI Insight. All rights reserved.
      </div>
    </footer>
  );
}

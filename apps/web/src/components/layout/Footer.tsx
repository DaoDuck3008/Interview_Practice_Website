import Link from "next/link";

const FOOTER_LINKS = {
  product: {
    title: "Sản phẩm",
    links: [
      { label: "Luyện tập", href: "/practice" },
      { label: "Chủ đề", href: "/practice" },
      { label: "Cấp độ Easy", href: "/practice?level=EASY" },
      { label: "Cấp độ Medium", href: "/practice?level=MEDIUM" },
      { label: "Cấp độ Hard", href: "/practice?level=HARD" },
      { label: "Ngẫu nhiên", href: "/practice/random" },
    ],
  },
  topics: {
    title: "Chủ đề nổi bật",
    links: [
      { label: "JavaScript", href: "/practice/javascript" },
      { label: "TypeScript", href: "/practice/typescript" },
      { label: "React", href: "/practice/react" },
      { label: "Node.js", href: "/practice/nodejs" },
      { label: "System Design", href: "/practice/system-design" },
      { label: "Databases", href: "/practice/databases" },
    ],
  },
  company: {
    title: "Công ty",
    links: [
      { label: "Giới thiệu", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Liên hệ", href: "#" },
      { label: "Chính sách bảo mật", href: "#" },
      { label: "Điều khoản sử dụng", href: "#" },
    ],
  },
};

const SOCIAL_LINKS = [
  {
    href: "#",
    label: "GitHub",
    path: "M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.744.083-.73.083-.73 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23A11.52 11.52 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.553 3.297-1.23 3.297-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.298 24 12c0-6.627-5.373-12-12-12z",
  },
  {
    href: "#",
    label: "Twitter / X",
    path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.632 5.905-5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  },
  {
    href: "#",
    label: "LinkedIn",
    path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  },
];

export default function Footer() {
  return (
    <footer
      className="relative overflow-hidden"
      style={{
        borderTop: "1px solid rgba(148,163,184,0.16)",
        background:
          "radial-gradient(circle at 50% 0%, rgba(124,58,237,0.14), transparent 34%), rgb(15, 23, 42)",
      }}
    >
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-px w-[700px] -translate-x-1/2"
        style={{
          background:
            "linear-gradient(to right, transparent, rgba(196,181,253,0.42), transparent)",
        }}
        aria-hidden="true"
      />

      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[180px] w-[600px] -translate-x-1/2"
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(124,58,237,0.14) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-5">
            <Link
              href="/"
              className="text-lg font-extrabold tracking-tight text-[#f4f4f6]"
            >
              Phỏng vấn <span className="text-[#8b5cf6]">IT</span>
            </Link>

            <p className="max-w-[220px] text-sm leading-relaxed text-[#c9c5d8]">
              Nền tảng luyện tập phỏng vấn IT với phản hồi tức thì từ AI. Dành
              cho lập trình viên Việt Nam.
            </p>

            <div className="mt-1 flex items-center gap-3">
              {SOCIAL_LINKS.map(({ href, label, path }) => (
                <Link
                  key={label}
                  href={href}
                  aria-label={label}
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-[#c9c5d8] transition-all duration-200 hover:border-[#7c3aed]/40 hover:text-[#a78bfa]"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d={path} />
                  </svg>
                </Link>
              ))}
            </div>
          </div>

          {Object.values(FOOTER_LINKS).map((col) => (
            <div key={col.title} className="flex flex-col gap-4">
              <p className="text-xs font-bold uppercase tracking-widest text-[#ddd6fe]">
                {col.title}
              </p>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="cursor-pointer text-sm text-[#c9c5d8] transition-colors duration-200 hover:text-[#c4b5fd]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="flex flex-col items-center justify-between gap-3 py-6 text-xs text-[#9898aa] sm:flex-row"
          style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
        >
          <p>© {new Date().getFullYear()} Phỏng vấn IT. All rights reserved.</p>
          <p>Made in Vietnam · Powered by DeepSeek AI & Groq</p>
        </div>
      </div>
    </footer>
  );
}

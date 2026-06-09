"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "/practice", label: "Luyện Tập" },
  { href: "#tinh-nang", label: "Tính Năng" },
  { href: "#cach-hoat-dong", label: "Cách Hoạt Động" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#06060c]/88 backdrop-blur-md border-b border-[#1c1c28]"
          : "bg-transparent"
      }`}
    >
      <nav className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="font-extrabold text-lg text-[#fafafa] tracking-tight"
        >
          Interview<span className="text-[#8b5cf6]">Prep</span>
        </Link>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-sm text-[#a1a1aa] hover:text-[#fafafa] transition-colors duration-200 cursor-pointer"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-[#a1a1aa] hover:text-[#fafafa] transition-colors duration-200 cursor-pointer px-3 py-1.5"
          >
            Đăng nhập
          </Link>
          <Link
            href="/register"
            className="text-sm font-semibold bg-[#7c3aed] hover:bg-[#6d28d9] text-white px-4 py-2 rounded-lg transition-colors duration-200 cursor-pointer"
            style={{ boxShadow: "0 0 14px rgba(124,58,237,0.3)" }}
          >
            Bắt đầu
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden text-[#a1a1aa] hover:text-[#fafafa] transition-colors cursor-pointer p-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#06060c]/95 backdrop-blur-md border-b border-[#1c1c28] px-6 pb-6">
          <ul className="flex flex-col gap-4 pt-4">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block text-sm text-[#a1a1aa] hover:text-[#fafafa] transition-colors duration-200 cursor-pointer py-1"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="pt-2 flex flex-col gap-3">
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="text-sm text-center text-[#a1a1aa] hover:text-[#fafafa] transition-colors duration-200 cursor-pointer py-2 border border-[#1c1c28] rounded-lg"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                onClick={() => setMenuOpen(false)}
                className="text-sm font-semibold text-center bg-[#7c3aed] hover:bg-[#6d28d9] text-white py-2 rounded-lg transition-colors duration-200 cursor-pointer"
              >
                Bắt đầu
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}

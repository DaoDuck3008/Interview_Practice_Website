"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Menu, X, LogOut, ChevronDown, LayoutDashboard } from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import { logoutApi } from "@/lib/api/auth";
import { useRouter } from "next/navigation";

const NAV_LINKS = [
  { href: "/practice", label: "Luyện Tập" },
  { href: "#tinh-nang", label: "Tính Năng" },
  { href: "#cach-hoat-dong", label: "Cách Hoạt Động" },
];

function UserDropdown({ name, role }: { name: string; role: string }) {
  const [open, setOpen] = useState(false);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    setOpen(false);
    try {
      await logoutApi();
    } catch {}
    clearAuth();
    router.push("/login");
  }

  const initial = name.charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#13131c] transition-colors duration-200 cursor-pointer"
      >
        {/* Avatar */}
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}
        >
          {initial}
        </div>
        <span className="text-sm text-[#f4f4f6] max-w-[120px] truncate">
          {name}
        </span>
        <ChevronDown
          size={13}
          className="text-[#606072] transition-transform duration-200 flex-shrink-0"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-48 rounded-md overflow-hidden z-50"
          style={{
            background: "#11111b98",
            border: "1px solid #1c1c28",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          <div className="py-1">
            {role === "ADMIN" && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#9898aa] hover:text-[#f4f4f6] hover:bg-[#13131c] transition-colors duration-150 cursor-pointer border-b border-[#1c1c28]"
              >
                <LayoutDashboard size={14} />
                Trang quản trị
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#9898aa] hover:text-[#f4f4f6] hover:bg-[#13131c] transition-colors duration-150 cursor-pointer"
            >
              <LogOut size={14} />
              Đăng xuất
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const router = useRouter();

  async function mobileLogout() {
    setMenuOpen(false);
    try {
      await logoutApi();
    } catch {}
    clearAuth();
  }

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
          {hydrated &&
            (user ? (
              <UserDropdown name={user.name} role={user.role} />
            ) : (
              <>
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
              </>
            ))}
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

            {hydrated && (
              <li className="pt-2 flex flex-col gap-3">
                {user ? (
                  <>
                    <div className="flex items-center gap-3 py-1">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                        style={{
                          background:
                            "linear-gradient(135deg, #7c3aed, #6d28d9)",
                        }}
                      >
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-[#f4f4f6]">
                        {user.name}
                      </span>
                    </div>
                    {user.role === "ADMIN" && (
                      <Link
                        href="/admin"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-center gap-2 text-sm text-[#a1a1aa] hover:text-[#fafafa] transition-colors duration-200 cursor-pointer py-2 border border-[#1c1c28] rounded-lg"
                      >
                        <LayoutDashboard size={14} />
                        Trang quản trị
                      </Link>
                    )}
                    <button
                      onClick={mobileLogout}
                      className="flex items-center justify-center gap-2 text-sm text-[#606072] hover:text-[#9898aa] transition-colors duration-200 cursor-pointer py-2 border border-[#1c1c28] rounded-lg"
                    >
                      <LogOut size={14} />
                      Đăng xuất
                    </button>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </li>
            )}
          </ul>
        </div>
      )}
    </header>
  );
}

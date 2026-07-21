"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Menu,
  X,
  LogOut,
  ChevronDown,
  LayoutDashboard,
  CreditCard,
  Zap,
  Bookmark,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import { usePracticeCountStore } from "@/stores/practiceCount.store";
import { useFavoritesStore } from "@/stores/favorites.store";
import { logoutApi } from "@/lib/api/auth";
import { useRouter } from "next/navigation";
import FavoritesDrawer from "./FavoritesDrawer";
import Avatar from "@/components/ui/Avatar";

// Mốc số câu đã luyện hôm nay -> màu + lời động viên (min giảm dần, khớp mốc đầu tiên đạt được).
const COUNT_TIERS: { min: number; color: string; message: string }[] = [
  {
    min: 4,
    color: "#8b5cf6",
    message: "Xuất sắc! Bạn đang rất chăm chỉ hôm nay.",
  },
  { min: 2, color: "#22c55e", message: "Đang vào phong độ!" },
  { min: 1, color: "#3b82f6", message: "Khởi động tốt!" },
  { min: 0, color: "#606072", message: "Luyện câu đầu tiên hôm nay nào!" },
];

function PracticeCountBadge() {
  const count = usePracticeCountStore((s) => s.count);
  const tier = COUNT_TIERS.find((t) => count >= t.min)!;

  return (
    <div
      title={tier.message}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg flex-shrink-0"
      style={{
        border: `1px solid ${tier.color}33`,
        background: `${tier.color}14`,
      }}
    >
      <Zap size={13} style={{ color: tier.color }} />
      <span
        className="text-xs font-bold font-mono tabular-nums"
        style={{ color: tier.color }}
      >
        {count}
      </span>
    </div>
  );
}

const NAV_LINKS = [
  { href: "/learning/javascript/questions", label: "Câu Hỏi" },
  { href: "/practice", label: "Luyện Tập" },
  { href: "/mock-interviews", label: "Mock Interview" },
  { href: "/pricing", label: "Bảng Giá" },
  // { href: "#tinh-nang", label: "Tính Năng" },
  // { href: "#cach-hoat-dong", label: "Cách Hoạt Động" },
];

function UserDropdown({
  name,
  role,
  avatarUrl,
  seed,
}: {
  name: string;
  role: string;
  avatarUrl?: string | null;
  seed: string;
}) {
  const [open, setOpen] = useState(false);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const resetFavorites = useFavoritesStore((s) => s.reset);
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
    resetFavorites();
    router.push("/login");
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#13131c] transition-colors duration-200 cursor-pointer"
      >
        <Avatar
          name={name}
          avatarUrl={avatarUrl}
          seed={seed}
          sizeClass="w-7 h-7"
          textClass="text-xs"
        />
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
            <Link
              href="/overview"
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#9898aa] hover:text-[#f4f4f6] hover:bg-[#13131c] transition-colors duration-150 cursor-pointer border-b border-[#1c1c28]"
            >
              <CreditCard size={14} />
              Trang cá nhân
            </Link>
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
  const [favDrawerOpen, setFavDrawerOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const resetFavorites = useFavoritesStore((s) => s.reset);

  const headerRef = useRef<HTMLElement>(null);

  async function mobileLogout() {
    setMenuOpen(false);
    try {
      await logoutApi();
    } catch {}
    clearAuth();
    resetFavorites();
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Đóng menu mobile khi bấm ra ngoài header hoặc nhấn Escape
  useEffect(() => {
    if (!menuOpen) return;
    function onPointer(e: MouseEvent) {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <header
      ref={headerRef}
      className={`sticky top-0 left-0 right-0 z-50 backdrop-blur-md transition-all duration-300 ${
        scrolled ? "bg-black/60 border-b border-[#1c1c28]" : "bg-black/30"
      }`}
    >
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0">
          <Image
            src="/logo.png"
            alt="Phỏng vấn IT"
            width={790}
            height={316}
            priority
            sizes="(max-width: 640px) 140px, 160px"
            className="h-14 sm:h-16 w-auto"
          />
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
              <>
                <PracticeCountBadge />
                <button
                  onClick={() => setFavDrawerOpen(true)}
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-[#a1a1aa] hover:text-[#f4f4f6] hover:bg-[#13131c] transition-colors duration-200 cursor-pointer"
                  aria-label="Câu hỏi đã lưu"
                  title="Câu hỏi đã lưu"
                >
                  <Bookmark size={16} />
                </button>
                <UserDropdown
                  name={user.name}
                  role={user.role}
                  avatarUrl={user.avatarUrl}
                  seed={user.email}
                />
              </>
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
        <div className="md:hidden bg-[#06060c]/95 backdrop-blur-md border-b border-[#1c1c28] px-4 sm:px-6 pb-6">
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
                      <Avatar
                        name={user.name}
                        avatarUrl={user.avatarUrl}
                        seed={user.email}
                        sizeClass="w-8 h-8"
                        textClass="text-sm"
                      />
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
                      onClick={() => {
                        setMenuOpen(false);
                        setFavDrawerOpen(true);
                      }}
                      className="flex items-center justify-center gap-2 text-sm text-[#a1a1aa] hover:text-[#fafafa] transition-colors duration-200 cursor-pointer py-2 border border-[#1c1c28] rounded-lg"
                    >
                      <Bookmark size={14} />
                      Câu hỏi đã lưu
                    </button>
                    <Link
                      href="/billing"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center justify-center gap-2 text-sm text-[#a1a1aa] hover:text-[#fafafa] transition-colors duration-200 cursor-pointer py-2 border border-[#1c1c28] rounded-lg"
                    >
                      <CreditCard size={14} />
                      Gói của tôi
                    </Link>
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

      <FavoritesDrawer
        open={favDrawerOpen}
        onClose={() => setFavDrawerOpen(false)}
      />
    </header>
  );
}

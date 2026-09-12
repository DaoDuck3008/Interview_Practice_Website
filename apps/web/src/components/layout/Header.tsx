"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import {
  Menu,
  LogOut,
  ChevronDown,
  LayoutDashboard,
  CreditCard,
  Bookmark,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import { useAiCreditsStore } from "@/stores/aiCredits.store";
import { useFavoritesStore } from "@/stores/favorites.store";
import { logoutApi } from "@/lib/api/auth";
import { usePathname, useRouter } from "next/navigation";
import FavoritesDrawer from "./FavoritesDrawer";
import HeaderMenuModal from "./HeaderMenuModal";
import Avatar from "@/components/ui/Avatar";

const NAV_LINKS = [
  { href: "/learning/javascript/questions", label: "Câu Hỏi" },
  { href: "/practice", label: "Luyện Tập" },
  { href: "/mock-interviews", label: "Mock Interview" },
  { href: "/mock-cv", label: "Mock CV" },
  { href: "/pricing", label: "Bảng Giá" },
];

function isNavActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href.startsWith("/learning")) return pathname.startsWith("/learning");
  return pathname === href || pathname.startsWith(`${href}/`);
}

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
  const resetAiCredits = useAiCreditsStore((s) => s.reset);
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
    resetAiCredits();
    resetFavorites();
    router.push("/login");
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex cursor-pointer items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 transition-[background-color,border-color,color] duration-300 hover:border-violet-300/25 hover:bg-white/[0.1] hover:text-white"
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
          className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-2xl backdrop-blur-2xl"
          style={{
            background: "rgba(15, 23, 42, 0.82)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 18px 50px rgba(2,6,23,0.38)",
          }}
        >
          <div className="py-1">
            {role === "ADMIN" && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 text-sm text-[#ddd6fe] transition-colors duration-200 hover:bg-white/[0.08] hover:text-white"
              >
                <LayoutDashboard size={14} />
                Trang quản trị
              </Link>
            )}
            <Link
              href="/overview"
              onClick={() => setOpen(false)}
              className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 text-sm text-[#ddd6fe] transition-colors duration-200 hover:bg-white/[0.08] hover:text-white"
            >
              <CreditCard size={14} />
              Trang cá nhân
            </Link>
            <button
              onClick={handleLogout}
              className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 text-sm text-[#ddd6fe] transition-colors duration-200 hover:bg-white/[0.08] hover:text-white"
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
  const [hoveredNavHref, setHoveredNavHref] = useState<string | null>(null);
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const activeNavHref =
    NAV_LINKS.find((link) => isNavActive(pathname, link.href))?.href ?? null;
  const highlightedNavHref = hoveredNavHref ?? activeNavHref;
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const resetAiCredits = useAiCreditsStore((s) => s.reset);
  const resetFavorites = useFavoritesStore((s) => s.reset);

  async function mobileLogout() {
    setMenuOpen(false);
    try {
      await logoutApi();
    } catch {}
    clearAuth();
    resetAiCredits();
    resetFavorites();
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky left-0 right-0 top-3 z-50 px-3 sm:px-5">
      <nav
        className={`mx-auto flex h-16 max-w-7xl items-center justify-between rounded-full border px-3 pr-2 shadow-[0_18px_65px_rgba(2,6,23,0.28)] backdrop-blur-2xl transition-[background-color,border-color] duration-300 sm:px-4 sm:pr-3 ${
          scrolled
            ? "border-white/[0.14] bg-[#0f172a]/72"
            : "border-white/[0.1] bg-[#0f172a]/46"
        }`}
      >
        {/* Logo */}
        <Link href="/" className="flex-shrink-0">
          <Image
            src="/logo.png"
            alt="Phỏng vấn IT"
            width={790}
            height={316}
            priority
            sizes="(max-width: 640px) 140px, 160px"
            className="h-12 w-auto sm:h-14"
          />
        </Link>

        {/* Desktop links */}
        <LayoutGroup id="primary-navigation">
          <ul
            className="hidden items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.035] p-1 lg:flex"
            onPointerLeave={() => setHoveredNavHref(null)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setHoveredNavHref(null);
              }
            }}
          >
            {NAV_LINKS.map((link) => {
              const active = isNavActive(pathname, link.href);
              const highlighted = highlightedNavHref === link.href;

              return (
                <li key={link.href} className="relative">
                  {highlighted && (
                    <motion.span
                      layoutId="primary-navigation-indicator"
                      className={`pointer-events-none absolute inset-0 rounded-full ring-1 ${
                        active
                          ? "bg-violet-500/24 shadow-[0_0_24px_rgba(139,92,246,0.26)] ring-violet-300/25"
                          : "bg-white/[0.08] ring-white/[0.10]"
                      }`}
                      transition={
                        shouldReduceMotion
                          ? { duration: 0 }
                          : {
                              type: "spring",
                              stiffness: 420,
                              damping: 34,
                              mass: 0.55,
                            }
                      }
                    />
                  )}
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    onPointerEnter={() => setHoveredNavHref(link.href)}
                    onFocus={() => setHoveredNavHref(link.href)}
                    className={`relative z-10 inline-flex cursor-pointer items-center rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                      active || highlighted ? "text-white" : "text-[#cbd5e1]"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </LayoutGroup>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-3 lg:flex">
          {hydrated &&
            (user ? (
              <>
                <button
                  onClick={() => setFavDrawerOpen(true)}
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-[#cbd5e1] transition-[background-color,border-color,color] duration-300 hover:border-violet-300/25 hover:bg-white/[0.1] hover:text-white"
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
                  className="cursor-pointer rounded-full px-4 py-2 text-sm font-medium text-[#cbd5e1] transition-colors duration-300 hover:bg-white/[0.08] hover:text-white"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/register"
                  className="cursor-pointer rounded-full bg-[#7c3aed]/90 px-4 py-2 text-sm font-semibold text-white transition-[transform,background-color] duration-300 hover:-translate-y-0.5 hover:bg-violet-400"
                  style={{ boxShadow: "0 0 14px rgba(124,58,237,0.3)" }}
                >
                  Bắt đầu
                </Link>
              </>
            ))}
        </div>

        {/* Mobile menu button */}
        <button
          className="cursor-pointer rounded-full border border-white/[0.08] bg-white/[0.04] p-2 text-[#cbd5e1] transition-[background-color,color] duration-300 hover:bg-white/[0.1] hover:text-white lg:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
        >
          <Menu size={20} />
        </button>
      </nav>

      <HeaderMenuModal open={menuOpen} onClose={() => setMenuOpen(false)}>
        <nav aria-label="Điều hướng trên thiết bị nhỏ">
          <ul className="flex flex-col gap-2">
            {NAV_LINKS.map((link) => {
              const active = isNavActive(pathname, link.href);

              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMenuOpen(false)}
                    className={`block cursor-pointer rounded-full px-4 py-2.5 text-sm font-medium transition-colors duration-300 ${
                      active
                        ? "bg-violet-500/24 text-white ring-1 ring-violet-300/25"
                        : "text-[#cbd5e1] hover:bg-white/[0.08] hover:text-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}

            {hydrated && (
              <li className="flex flex-col gap-3 border-t border-white/[0.08] pt-4">
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
                        className="flex cursor-pointer items-center justify-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.04] py-2 text-sm text-[#cbd5e1] transition-colors duration-300 hover:bg-white/[0.1] hover:text-white"
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
                      className="flex cursor-pointer items-center justify-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.04] py-2 text-sm text-[#cbd5e1] transition-colors duration-300 hover:bg-white/[0.1] hover:text-white"
                    >
                      <Bookmark size={14} />
                      Câu hỏi đã lưu
                    </button>
                    <Link
                      href="/billing"
                      onClick={() => setMenuOpen(false)}
                      className="flex cursor-pointer items-center justify-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.04] py-2 text-sm text-[#cbd5e1] transition-colors duration-300 hover:bg-white/[0.1] hover:text-white"
                    >
                      <CreditCard size={14} />
                      Gói của tôi
                    </Link>
                    <button
                      onClick={mobileLogout}
                      className="flex cursor-pointer items-center justify-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.025] py-2 text-sm text-[#94a3b8] transition-colors duration-300 hover:bg-white/[0.08] hover:text-white"
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
                      className="cursor-pointer rounded-full border border-white/[0.1] bg-white/[0.04] py-2 text-center text-sm text-[#cbd5e1] transition-colors duration-300 hover:bg-white/[0.1] hover:text-white"
                    >
                      Đăng nhập
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setMenuOpen(false)}
                      className="cursor-pointer rounded-full bg-[#7c3aed]/90 py-2 text-center text-sm font-semibold text-white transition-colors duration-300 hover:bg-violet-400"
                    >
                      Bắt đầu
                    </Link>
                  </>
                )}
              </li>
            )}
          </ul>
        </nav>
      </HeaderMenuModal>

      <FavoritesDrawer
        open={favDrawerOpen}
        onClose={() => setFavDrawerOpen(false)}
      />
    </header>
  );
}

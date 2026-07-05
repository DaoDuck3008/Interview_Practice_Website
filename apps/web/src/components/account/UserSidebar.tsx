"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bookmark,
  CreditCard,
  Gauge,
  History,
  LayoutDashboard,
  UserCircle,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  enabled: boolean;
}

// Khu vực tài khoản. Trang chưa dựng để enabled:false (hiện "Sắp có", không bấm được)
// — khi tạo xong page chỉ cần bật enabled:true.
const NAV_ITEMS: NavItem[] = [
  {
    href: "/overview",
    label: "Tổng quan",
    icon: LayoutDashboard,
    enabled: true,
  },
  {
    href: "/profile",
    label: "Thông tin cá nhân",
    icon: UserCircle,
    enabled: true,
  },
  { href: "/billing", label: "Gói của tôi", icon: CreditCard, enabled: true },
  { href: "/usage", label: "Mức sử dụng", icon: Gauge, enabled: true },
  {
    href: "/saved",
    label: "Câu hỏi đã lưu",
    icon: Bookmark,
    enabled: true,
  },
];

export default function UserSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-full flex-shrink-0 rounded-2xl p-3 md:w-60 md:self-start"
      style={{
        background: "rgba(16, 15, 26, 0.55)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <p className="hidden px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] md:block">
        Tài khoản
      </p>
      {/* Mobile: thanh tab cuộn ngang. Desktop (md+): danh sách dọc như cũ. */}
      <nav className="flex gap-1 overflow-x-auto gap-2 py-2 md:flex-col md:overflow-visible md:pb-0">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.enabled && pathname === item.href;

          if (!item.enabled) {
            return (
              <div
                key={item.href}
                aria-disabled="true"
                className="flex flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border-b-2 border-transparent px-3 py-2.5 text-sm text-[var(--color-text-secondary)] opacity-50 cursor-not-allowed md:gap-3 md:border-b-0 md:border-l-2"
              >
                <Icon size={16} className="flex-shrink-0" />
                <span>{item.label}</span>
                <span className="ml-auto hidden rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-medium text-[var(--color-text-muted)] md:inline-flex">
                  Sắp có
                </span>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border-b-2 px-3 py-2.5 text-sm transition-colors duration-150 md:gap-3 md:border-b-0 md:border-l-2 ${
                active
                  ? "border-[var(--color-accent)] bg-[rgba(124,58,237,0.14)] font-semibold text-[var(--color-text-primary)]"
                  : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <Icon
                size={16}
                className={`flex-shrink-0 ${
                  active ? "text-[var(--color-accent-light)]" : ""
                }`}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

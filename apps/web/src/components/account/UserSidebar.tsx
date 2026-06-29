"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bookmark,
  CreditCard,
  History,
  LayoutDashboard,
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
  { href: "/billing", label: "Gói của tôi", icon: CreditCard, enabled: true },
  {
    href: "/overview",
    label: "Tổng quan",
    icon: LayoutDashboard,
    enabled: false,
  },
  {
    href: "/history",
    label: "Lịch sử trả lời",
    icon: History,
    enabled: false,
  },
  {
    href: "/saved",
    label: "Câu hỏi đã lưu",
    icon: Bookmark,
    enabled: false,
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
      <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        Tài khoản
      </p>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.enabled && pathname === item.href;

          if (!item.enabled) {
            return (
              <div
                key={item.href}
                aria-disabled="true"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm opacity-50 cursor-not-allowed text-[var(--color-text-secondary)]"
                style={{ borderLeft: "2px solid transparent" }}
              >
                <Icon size={16} className="flex-shrink-0" />
                <span>{item.label}</span>
                <span className="ml-auto inline-flex rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-medium text-[var(--color-text-muted)]">
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
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-150"
              style={{
                background: active ? "rgba(124,58,237,0.14)" : "transparent",
                borderLeft: active
                  ? "2px solid var(--color-accent)"
                  : "2px solid transparent",
                color: active
                  ? "var(--color-text-primary)"
                  : "var(--color-text-secondary)",
                fontWeight: active ? 600 : 400,
              }}
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

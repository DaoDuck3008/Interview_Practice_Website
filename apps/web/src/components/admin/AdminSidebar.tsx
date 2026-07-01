"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FolderTree,
  ListChecks,
  CreditCard,
  Repeat,
  Wallet,
  Home,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const NAV = [
  { href: "/admin", label: "Tổng quan", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Người dùng", icon: Users, exact: false },
  { href: "/admin/topics", label: "Chủ đề", icon: FolderTree, exact: false },
  { href: "/admin/questions", label: "Câu hỏi", icon: ListChecks, exact: false },
  { href: "/admin/plans", label: "Gói", icon: CreditCard, exact: false },
  {
    href: "/admin/subscriptions",
    label: "Gói đăng ký",
    icon: Repeat,
    exact: false,
  },
  { href: "/admin/payments", label: "Giao dịch", icon: Wallet, exact: false },
];

export const SIDEBAR_WIDTH = { expanded: "15rem", collapsed: "4.5rem" };

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

export default function AdminSidebar({ collapsed, onToggle }: Props) {
  const pathname = usePathname();

  return (
    <aside
      className="fixed left-0 top-0 z-40 h-screen flex flex-col bg-[#0d0d14] border-r border-[#1c1c28] transition-[width] duration-200"
      style={{
        width: collapsed ? SIDEBAR_WIDTH.collapsed : SIDEBAR_WIDTH.expanded,
      }}
    >
      <div className="h-14 flex items-center justify-center overflow-hidden px-3 border-b border-[#1c1c28]">
        <Link
          href="/"
          className="font-extrabold text-base text-[#f4f4f6] tracking-tight whitespace-nowrap"
        >
          {collapsed ? (
            <span className="text-[#8b5cf6]">IP</span>
          ) : (
            <>
              Interview<span className="text-[#8b5cf6]">Prep</span>
              <span className="ml-2 text-[10px] font-mono font-medium text-[#606072] uppercase tracking-wider">
                admin
              </span>
            </>
          )}
        </Link>
      </div>

      <nav className="flex flex-col gap-1 p-3 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors duration-150"
              style={{
                background: active ? "#13131c" : "transparent",
                borderLeft: active
                  ? "2px solid #7c3aed"
                  : "2px solid transparent",
                color: active ? "#f4f4f6" : "#9898aa",
                justifyContent: collapsed ? "center" : "flex-start",
              }}
            >
              <Icon size={16} className="flex-shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-1 p-3 border-t border-[#1c1c28]">
        <button
          onClick={onToggle}
          title={collapsed ? "Mở rộng" : "Thu gọn"}
          className="flex cursor-pointer items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#9898aa] transition-colors duration-150 hover:bg-[#13131c] hover:text-[#f4f4f6]"
          style={{ justifyContent: collapsed ? "center" : "flex-start" }}
        >
          {collapsed ? (
            <ChevronRight size={16} className="flex-shrink-0" />
          ) : (
            <ChevronLeft size={16} className="flex-shrink-0" />
          )}
          {!collapsed && <span className="truncate">Thu gọn</span>}
        </button>

        <Link
          href="/"
          title={collapsed ? "Về trang chủ" : undefined}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#9898aa] transition-colors duration-150 hover:bg-[#13131c] hover:text-[#f4f4f6]"
          style={{ justifyContent: collapsed ? "center" : "flex-start" }}
        >
          <Home size={16} className="flex-shrink-0" />
          {!collapsed && <span className="truncate">Về trang chủ</span>}
        </Link>
      </div>
    </aside>
  );
}

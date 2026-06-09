"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FolderTree, ListChecks } from "lucide-react";

const NAV = [
  { href: "/admin", label: "Tổng quan", icon: LayoutDashboard, exact: true },
  { href: "/admin/topics", label: "Chủ đề", icon: FolderTree, exact: false },
  { href: "/admin/questions", label: "Câu hỏi", icon: ListChecks, exact: false },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 w-60 h-screen flex flex-col bg-[#0d0d14] border-r border-[#1c1c28]">
      <div className="h-14 flex items-center px-5 border-b border-[#1c1c28]">
        <Link href="/" className="font-extrabold text-base text-[#f4f4f6] tracking-tight">
          Interview<span className="text-[#8b5cf6]">Prep</span>
          <span className="ml-2 text-[10px] font-mono font-medium text-[#606072] uppercase tracking-wider">
            admin
          </span>
        </Link>
      </div>

      <nav className="flex flex-col gap-1 p-3">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors duration-150"
              style={{
                background: active ? "#13131c" : "transparent",
                borderLeft: active
                  ? "2px solid #7c3aed"
                  : "2px solid transparent",
                color: active ? "#f4f4f6" : "#9898aa",
              }}
            >
              <Icon size={16} className="flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ChevronDown } from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import { logoutApi } from "@/lib/api/auth";

export default function AdminHeader({ title }: { title?: string }) {
  const [open, setOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function handleLogout() {
    setOpen(false);
    try {
      await logoutApi();
    } catch {}
    clearAuth();
    router.push("/login");
  }

  const name = user?.name ?? "Admin";
  const initial = name.charAt(0).toUpperCase();

  return (
    <header className="h-14 flex-shrink-0 flex items-center justify-between px-8 border-b border-[#1c1c28] bg-[#06060c]/88 backdrop-blur-md sticky top-0 z-40">
      <h1 className="text-sm font-semibold text-[#f4f4f6]">{title ?? "Quản trị"}</h1>

      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#13131c] transition-colors duration-200 cursor-pointer"
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}
          >
            {initial}
          </div>
          <span className="text-sm text-[#f4f4f6] max-w-[140px] truncate">
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
              background: "#11111b",
              border: "1px solid #1c1c28",
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            }}
          >
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#9898aa] hover:text-[#f4f4f6] hover:bg-[#13131c] transition-colors duration-150 cursor-pointer"
            >
              <LogOut size={14} />
              Đăng xuất
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

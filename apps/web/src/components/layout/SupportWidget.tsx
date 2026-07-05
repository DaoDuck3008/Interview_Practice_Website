"use client";

import { useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import SupportChatPopup from "./SupportChatPopup";

const ZALO_URL = "https://zalo.me/0353102705";

// Ẩn widget ở khu vực admin (họ chính là người nhận hỗ trợ) và các trang auth
// (chưa đăng nhập xong, chưa có gì để chat).
const HIDDEN_PREFIXES = [
  "/admin",
  "/login",
  "/register",
  "/forgot-password",
  "/verify-email",
];

export default function SupportWidget() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const [chatOpen, setChatOpen] = useState(false);

  // Chờ hydrate xong mới biết role — tránh nháy icon chat rồi ẩn ngay với admin.
  if (!hydrated) return null;

  const hidden =
    HIDDEN_PREFIXES.some((p) => pathname?.startsWith(p)) ||
    user?.role === "ADMIN";
  if (hidden) return null;

  return (
    <>
      <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-3">
        <a
          href={ZALO_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="Liên hệ qua Zalo"
          className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full transition-transform duration-200 hover:scale-110"
          style={{ background: "#fff", boxShadow: "0 4px 16px rgba(0,0,0,0.35)" }}
        >
          <Image
            src="/images/zalo_icon.webp"
            alt="Liên hệ qua Zalo"
            width={48}
            height={48}
          />
        </a>

        {user && (
          <button
            onClick={() => setChatOpen((o) => !o)}
            title="Chat trực tiếp với admin"
            aria-label="Chat trực tiếp với admin"
            className="flex h-12 w-12 items-center justify-center rounded-full transition-transform duration-200 cursor-pointer hover:scale-110"
            style={{
              background: "#7c3aed",
              boxShadow: "0 4px 16px rgba(124,58,237,0.4)",
            }}
          >
            <MessageCircle size={22} className="text-white" />
          </button>
        )}
      </div>

      {chatOpen && user && (
        <SupportChatPopup onClose={() => setChatOpen(false)} />
      )}
    </>
  );
}

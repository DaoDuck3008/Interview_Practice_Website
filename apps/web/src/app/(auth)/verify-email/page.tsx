import type { Metadata } from "next";
import VerifyEmailPageClient from "@/components/auth/VerifyEmailPageClient";

export const metadata: Metadata = {
  title: "Xác thực email — Phỏng vấn IT",
  description:
    "Xác thực email tài khoản Phỏng vấn IT để kích hoạt tài khoản và bắt đầu luyện tập phỏng vấn IT.",
};

export default function VerifyEmailPage() {
  return <VerifyEmailPageClient />;
}

import type { Metadata } from "next";
import LoginPageClient from "@/components/auth/LoginPageClient";

export const metadata: Metadata = {
  title: "Đăng nhập — Phỏng vấn IT",
  description:
    "Đăng nhập Phỏng vấn IT để tiếp tục luyện tập câu hỏi kỹ thuật, xem lịch sử trả lời và theo dõi tiến bộ.",
};

export default function LoginPage() {
  return <LoginPageClient />;
}

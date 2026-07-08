import type { Metadata } from "next";
import RegisterPageClient from "@/components/auth/RegisterPageClient";

export const metadata: Metadata = {
  title: "Đăng ký — Phỏng vấn IT",
  description:
    "Tạo tài khoản Phỏng vấn IT để luyện tập câu hỏi phỏng vấn kỹ thuật, ghi âm câu trả lời và nhận phản hồi từ AI.",
};

export default function RegisterPage() {
  return <RegisterPageClient />;
}

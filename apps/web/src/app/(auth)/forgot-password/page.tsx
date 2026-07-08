import type { Metadata } from "next";
import ForgotPasswordPageClient from "@/components/auth/ForgotPasswordPageClient";

export const metadata: Metadata = {
  title: "Quên mật khẩu — Phỏng vấn IT",
  description:
    "Khôi phục mật khẩu tài khoản Phỏng vấn IT bằng mã xác thực gửi qua email để tiếp tục luyện tập.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordPageClient />;
}

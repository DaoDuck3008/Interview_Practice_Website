import ForgotPasswordPageClient from "@/components/auth/ForgotPasswordPageClient";
import { createSeoMetadata } from "@/lib/seo";

export const metadata = createSeoMetadata({
  title: "Quên mật khẩu — Phỏng vấn IT",
  description:
    "Khôi phục mật khẩu tài khoản Phỏng vấn IT bằng mã xác thực gửi qua email để tiếp tục luyện tập.",
});

export default function ForgotPasswordPage() {
  return <ForgotPasswordPageClient />;
}

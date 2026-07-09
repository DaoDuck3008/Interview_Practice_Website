import LoginPageClient from "@/components/auth/LoginPageClient";
import { createSeoMetadata } from "@/lib/seo";

export const metadata = createSeoMetadata({
  title: "Đăng nhập — Phỏng vấn IT",
  description:
    "Đăng nhập Phỏng vấn IT để tiếp tục luyện tập câu hỏi kỹ thuật, xem lịch sử trả lời và theo dõi tiến bộ.",
});

export default function LoginPage() {
  return <LoginPageClient />;
}

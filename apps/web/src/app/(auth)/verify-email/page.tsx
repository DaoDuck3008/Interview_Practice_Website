import VerifyEmailPageClient from "@/components/auth/VerifyEmailPageClient";
import { createSeoMetadata } from "@/lib/seo";

export const metadata = createSeoMetadata({
  title: "Xác thực email — Phỏng vấn IT",
  description:
    "Xác thực email tài khoản Phỏng vấn IT để kích hoạt tài khoản và bắt đầu luyện tập phỏng vấn IT.",
});

export default function VerifyEmailPage() {
  return <VerifyEmailPageClient />;
}

import ProfileView from "@/components/account/ProfileView";
import { createSeoMetadata } from "@/lib/seo";

export const metadata = createSeoMetadata({
  title: "Thông tin cá nhân — Phỏng vấn IT",
  description: "Xem thông tin tài khoản và đổi mật khẩu.",
});

export default function ProfilePage() {
  return <ProfileView />;
}

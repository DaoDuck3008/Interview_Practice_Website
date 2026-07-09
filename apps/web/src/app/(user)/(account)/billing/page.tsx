import BillingView from "@/components/account/BillingView";
import { createSeoMetadata } from "@/lib/seo";

export const metadata = createSeoMetadata({
  title: "Gói của tôi — Phỏng vấn IT",
  description: "Quản lý gói đang dùng và xem lịch sử thanh toán của bạn.",
});

export default function BillingPage() {
  return <BillingView />;
}

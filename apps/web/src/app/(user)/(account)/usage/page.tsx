import UsageView from "@/components/account/UsageView";
import { createSeoMetadata } from "@/lib/seo";

export const metadata = createSeoMetadata({
  title: "Mức sử dụng — Phỏng vấn IT",
  description: "Theo dõi hạn mức luyện tập đã dùng trong ngày và trong tháng.",
});

export default function UsagePage() {
  return <UsageView />;
}

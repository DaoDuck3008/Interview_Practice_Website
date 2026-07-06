import UsageView from "@/components/account/UsageView";

export const metadata = {
  title: "Mức sử dụng — Phỏng vấn IT",
  description: "Theo dõi hạn mức luyện tập đã dùng trong ngày và trong tháng.",
};

export default function UsagePage() {
  return <UsageView />;
}

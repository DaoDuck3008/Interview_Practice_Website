import OverviewView from "@/components/account/OverviewView";
import { createSeoMetadata } from "@/lib/seo";

export const metadata = createSeoMetadata({
  title: "Tổng quan — Phỏng vấn IT",
  description: "Dashboard cá nhân: lịch sử luyện tập, thống kê và tiến bộ.",
});

export default function OverviewPage() {
  return <OverviewView />;
}

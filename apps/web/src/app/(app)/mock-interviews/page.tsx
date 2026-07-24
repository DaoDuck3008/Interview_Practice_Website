import { createSeoMetadata } from "@/lib/seo";
import MockInterviewsLanding from "@/components/mock-interviews/mock-landing/MockInterviewsLanding";

export const metadata = createSeoMetadata({
  title: "Mock interview có giới hạn thời gian - Phỏng vấn IT",
  description:
    "Tạo buổi mock interview theo chủ đề, cấp độ và thời lượng. Người dùng có thể xem tính năng trước khi đăng nhập, chỉ cần đăng nhập khi bắt đầu luyện.",
});

export default function MockInterviewsPage() {
  return <MockInterviewsLanding />;
}

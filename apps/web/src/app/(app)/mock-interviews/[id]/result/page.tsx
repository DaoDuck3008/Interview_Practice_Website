import MockInterviewResult from "@/components/mock-interviews/mock-result/MockInterviewResult";
import { createSeoMetadata } from "@/lib/seo";

export const metadata = createSeoMetadata({
  title: "Kết quả mock interview - Phỏng vấn IT",
  description:
    "Xem điểm tổng quan, phân tích từng câu trả lời và gợi ý cải thiện sau buổi mock interview.",
});

export default async function MockInterviewResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MockInterviewResult id={id} />;
}

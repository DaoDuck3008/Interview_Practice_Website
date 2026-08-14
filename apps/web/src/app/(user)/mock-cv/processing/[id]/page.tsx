import MockCvProcessing from "@/components/mock-cv/MockCvProcessing";
import { createSeoMetadata } from "@/lib/seo";

export const metadata = createSeoMetadata({
  title: "Đang chuẩn bị bài luyện theo CV - Phỏng vấn IT",
  description:
    "Theo dõi quá trình phân tích CV và chuẩn bị bộ câu hỏi phỏng vấn cá nhân hóa.",
});

export default async function MockCvProcessingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MockCvProcessing id={id} />;
}

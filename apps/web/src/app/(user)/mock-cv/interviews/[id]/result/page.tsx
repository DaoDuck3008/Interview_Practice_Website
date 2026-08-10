import MockCvInterviewResult from "@/components/mock-cv/interview/MockCvInterviewResult";
import { createSeoMetadata } from "@/lib/seo";

export const metadata = createSeoMetadata({
  title: "Kết quả phỏng vấn theo CV - Phỏng vấn IT",
  description:
    "Xem điểm, transcript và nhận xét sau buổi luyện phỏng vấn dựa trên CV.",
});

export default async function MockCvInterviewResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MockCvInterviewResult id={id} />;
}

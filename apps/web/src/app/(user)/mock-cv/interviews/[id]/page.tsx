import MockCvInterviewRoom from "@/components/mock-cv/interview/MockCvInterviewRoom";
import { createSeoMetadata } from "@/lib/seo";

export const metadata = createSeoMetadata({
  title: "Phòng luyện phỏng vấn theo CV - Phỏng vấn IT",
  description:
    "Trả lời bộ câu hỏi bám sát CV và vị trí ứng tuyển trong thời gian giới hạn.",
});

export default async function MockCvInterviewRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MockCvInterviewRoom id={id} />;
}

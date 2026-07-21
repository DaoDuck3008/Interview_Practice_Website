import { createSeoMetadata } from "@/lib/seo";
import MockInterviewRoom from "@/components/mock-interviews/MockInterviewRoom";

export const metadata = createSeoMetadata({
  title: "Phòng mock interview — Phỏng vấn IT",
  description:
    "Trả lời bộ câu hỏi phỏng vấn theo thời gian giới hạn, ghi âm từng câu và nộp bài để AI chấm tổng quan.",
});

export default async function MockInterviewRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MockInterviewRoom id={id} />;
}

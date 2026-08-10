import type { Metadata } from "next";
import MockCvPage from "@/components/mock-cv/MockCvPage";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "Luyện phỏng vấn theo CV",
  description:
    "Tải CV lên và luyện phỏng vấn với bộ câu hỏi bám sát kinh nghiệm, kỹ năng và vị trí ứng tuyển của bạn.",
});

export default function Page() {
  return <MockCvPage />;
}

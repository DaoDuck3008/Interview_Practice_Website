import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { getQuestionsByTopic } from "@/lib/api/questions";

export const metadata: Metadata = {
  title: "Luyện tập theo chủ đề — Phỏng vấn IT",
  description:
    "Chọn câu hỏi đầu tiên trong chủ đề luyện tập và bắt đầu trả lời phỏng vấn IT với phản hồi hỗ trợ từ AI.",
};

export default async function TopicIndexPage({
  params,
}: {
  params: Promise<{ topicSlug: string }>;
}) {
  const { topicSlug } = await params;
  const questions = await getQuestionsByTopic(topicSlug);
  const first = questions[0];

  if (!first) notFound();

  redirect(`/practice/${topicSlug}/${first.id}`);
}

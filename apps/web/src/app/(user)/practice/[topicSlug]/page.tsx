import { redirect, notFound } from "next/navigation";
import { getQuestionsByTopic } from "@/lib/api/questions";

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

import { getTopicsWithCounts } from "@/lib/api/topics";
import { getQuestionsPublic } from "@/lib/api/questions";
import type { Level } from "@/lib/api/questions";
import QuestionBrowser from "@/components/questions/QuestionBrowser";

interface PageProps {
  params: Promise<{ topicSlug: string }>;
  searchParams: Promise<{
    page?: string;
    limit?: string;
    level?: string;
    search?: string;
  }>;
}

export default async function LearningQuestionsPage({
  params,
  searchParams,
}: PageProps) {
  const { topicSlug } = await params;
  const { page: pageStr, limit: limitStr, level, search } = await searchParams;

  const page = Math.max(1, parseInt(pageStr ?? "1") || 1);
  const limit = 100;
  const levelFilter = (["COMMON", "MEDIUM", "HARD"] as Level[]).includes(
    level as Level,
  )
    ? (level as Level)
    : undefined;
  const searchQuery = search?.trim() || undefined;

  const topics = await getTopicsWithCounts();
  const currentTopic = topics.find((t) => t.slug === topicSlug);

  const result = currentTopic
    ? await getQuestionsPublic({
        topicId: currentTopic.id,
        level: levelFilter,
        search: searchQuery,
        page,
        limit,
      })
    : { items: [], total: 0, page, limit, totalPages: 0 };

  return (
    <QuestionBrowser
      topics={topics}
      currentTopicSlug={topicSlug}
      initialResult={result}
      initialPage={page}
      initialLimit={limit}
      initialLevel={levelFilter}
      initialSearch={searchQuery}
    />
  );
}

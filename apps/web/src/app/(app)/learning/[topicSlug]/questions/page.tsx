import { getTopicsWithCounts } from "@/lib/api/topics";
import { getQuestionsPublic } from "@/lib/api/questions";
import type { Level } from "@/lib/api/questions";
import QuestionBrowser from "@/components/questions/QuestionBrowser";
import {
  createJsonLdMarkup,
  createSeoMetadata,
  getAbsoluteUrl,
} from "@/lib/seo";
import { getLearningQuestionHref } from "@/lib/utils/question-url";

export const metadata = createSeoMetadata({
  title: "Thư viện câu hỏi phỏng vấn IT — Phỏng vấn IT",
  description:
    "Khám phá bộ câu hỏi phỏng vấn IT theo chủ đề, cấp độ và từ khóa để ôn tập trước khi bước vào buổi phỏng vấn.",
});

interface PageProps {
  params: Promise<{ topicSlug: string }>;
  searchParams: Promise<{
    page?: string;
    level?: string;
    search?: string;
  }>;
}

export default async function LearningQuestionsPage({
  params,
  searchParams,
}: PageProps) {
  const { topicSlug } = await params;
  const { page: pageStr, level, search } = await searchParams;

  const page = Math.max(1, parseInt(pageStr ?? "1") || 1);
  const limit = 30;
  const levelFilter = (["EASY", "MEDIUM", "HARD"] as Level[]).includes(
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

  // Tạo dữ liệu JSON-LD cho SEO
  const pageUrl = getAbsoluteUrl(`/learning/${topicSlug}/questions`);
  const jsonLd = currentTopic
    ? {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: `${currentTopic.name} interview questions`,
        description:
          "Danh sách câu hỏi phỏng vấn IT theo chủ đề để học và luyện tập.",
        url: pageUrl,
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: result.total,
          itemListElement: result.items.map((question, index) => ({
            "@type": "ListItem",
            position: (page - 1) * limit + index + 1,
            url: getAbsoluteUrl(
              getLearningQuestionHref(currentTopic.slug, question),
            ),
            name: question.content,
          })),
        },
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={createJsonLdMarkup(jsonLd)}
        />
      )}
      <QuestionBrowser
        topics={topics}
        currentTopicSlug={topicSlug}
        initialResult={result}
        initialPage={page}
        initialLimit={limit}
        initialLevel={levelFilter}
        initialSearch={searchQuery}
      />
    </>
  );
}

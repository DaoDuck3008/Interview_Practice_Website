import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import LearningQuestionDetail from "@/components/questions/LearningQuestionDetail";
import { getQuestion, getQuestionsPublic } from "@/lib/api/questions";
import { createSeoMetadata } from "@/lib/seo";
import {
  getLearningQuestionHref,
  isCanonicalQuestionSlugId,
  parseQuestionSlugId,
} from "@/lib/utils/question-url";

interface PageProps {
  params: Promise<{ topicSlug: string; questionSlugId: string }>;
}

const DEFAULT_METADATA = createSeoMetadata({
  title: "Chi tiết câu hỏi phỏng vấn IT — Phỏng vấn IT",
  description:
    "Xem câu hỏi phỏng vấn IT, đáp án tóm tắt, đáp án chi tiết và các câu hỏi liên quan để ôn tập hiệu quả.",
});

function truncateSeoText(text: string, maxLength: number) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;

  const sliced = normalized.slice(0, maxLength - 1).trimEnd();
  const lastSpace = sliced.lastIndexOf(" ");
  const safeText = lastSpace > 40 ? sliced.slice(0, lastSpace) : sliced;

  return `${safeText}…`;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { topicSlug, questionSlugId } = await params;
  const { id: questionId } = parseQuestionSlugId(questionSlugId);
  const question = await getQuestion(questionId);

  if (!question) return DEFAULT_METADATA;

  const canonicalTopicSlug = question.topic?.slug ?? topicSlug;
  const title = `${truncateSeoText(question.content, 72)} — Phỏng vấn IT`;
  const description = truncateSeoText(
    question.answerKeySummary ||
      `Xem đáp án chi tiết cho câu hỏi "${question.content}" và ôn tập thêm các câu hỏi phỏng vấn IT liên quan.`,
    155,
  );

  return {
    ...createSeoMetadata({ title, description }),
    alternates: {
      canonical: getLearningQuestionHref(canonicalTopicSlug, question),
    },
  };
}

export default async function LearningQuestionDetailPage({
  params,
}: PageProps) {
  const { topicSlug, questionSlugId } = await params;
  const { id: questionId } = parseQuestionSlugId(questionSlugId);
  const question = await getQuestion(questionId);

  if (!question) notFound();

  const canonicalTopicSlug = question.topic?.slug ?? topicSlug;
  if (
    topicSlug !== canonicalTopicSlug ||
    !isCanonicalQuestionSlugId(questionSlugId, question)
  ) {
    permanentRedirect(getLearningQuestionHref(canonicalTopicSlug, question));
  }

  const [sameTopicResult, latestResult] = await Promise.all([
    getQuestionsPublic({
      topicId: question.topicId,
      limit: 7,
    }),
    getQuestionsPublic({
      sortBy: "createdAt",
      order: "desc",
      limit: 7,
    }),
  ]);

  return (
    <LearningQuestionDetail
      question={question}
      sameTopicQuestions={sameTopicResult.items}
      latestQuestions={latestResult.items}
      topicSlug={canonicalTopicSlug}
    />
  );
}

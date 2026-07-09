import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getQuestion, getQuestionOrder } from "@/lib/api/questions";
import PracticeContent from "@/components/practice/PracticeContent";
import PracticeNavFooter from "@/components/practice/PracticeNavFooter";
import { formatTopicName } from "@/lib/utils/topics";
import { LEVEL_STYLE } from "@/lib/utils/levels";
import { createSeoMetadata } from "@/lib/seo";
import {
  getPracticeQuestionHref,
  isCanonicalQuestionSlugId,
  parseQuestionSlugId,
} from "@/lib/utils/question-url";

const DEFAULT_METADATA = createSeoMetadata({
  title: "Câu hỏi luyện tập phỏng vấn IT — Phỏng vấn IT",
  description:
    "Trả lời câu hỏi phỏng vấn IT, ghi âm phần trình bày và nhận đánh giá AI kèm gợi ý cải thiện.",
});

interface PageProps {
  params: Promise<{ topicSlug: string; questionSlugId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

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

  const topicName = question.topic?.name ?? formatTopicName(topicSlug);
  const canonicalTopicSlug = question.topic?.slug ?? topicSlug;
  const questionTitle = truncateSeoText(question.content, 72);
  const questionDescription = truncateSeoText(
    `Luyện tập trả lời câu hỏi "${question.content}" trong chủ đề ${topicName}, ghi âm câu trả lời và nhận đánh giá AI kèm gợi ý cải thiện.`,
    155,
  );

  return {
    ...createSeoMetadata({
      title: `${questionTitle} — Phỏng vấn IT`,
      description: questionDescription,
    }),
    alternates: {
      canonical: getPracticeQuestionHref(canonicalTopicSlug, question),
    },
  };
}

export default async function QuestionPage({ params, searchParams }: PageProps) {
  const { topicSlug, questionSlugId } = await params;
  const { id: questionId } = parseQuestionSlugId(questionSlugId);

  const question = await getQuestion(questionId);
  if (!question) notFound();

  const canonicalTopicSlug = question.topic?.slug ?? topicSlug;
  if (
    topicSlug !== canonicalTopicSlug ||
    !isCanonicalQuestionSlugId(questionSlugId, question)
  ) {
    const resolvedSearchParams = await searchParams;
    const level = resolvedSearchParams?.level;
    const levelParam = typeof level === "string" ? `?level=${level}` : "";

    permanentRedirect(
      getPracticeQuestionHref(canonicalTopicSlug, question, levelParam),
    );
  }

  const order = await getQuestionOrder(question.topicId);
  const topicName = question.topic?.name ?? formatTopicName(topicSlug);
  const levelStyle = LEVEL_STYLE[question.level];

  return (
    /* Cột nội dung — glassy panel (sidebar nằm ở layout) */
    <main
      className="flex-1 flex flex-col overflow-hidden rounded-2xl"
      style={{
        background: "rgba(16, 15, 26, 0.55)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div className="flex-1 overflow-y-auto">
        <div className="w-full flex flex-col gap-4 px-5 sm:px-10 lg:px-16 py-7">
          {/* Question card */}
          <section
            className="rounded-2xl px-6 py-6 flex flex-col gap-5"
            style={{
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-1.5 text-xs text-[#606072] min-w-0">
              <Link
                href="/"
                className="hover:text-[#9898aa] transition-colors flex-shrink-0"
              >
                Trang chủ
              </Link>
              <ChevronRight size={12} className="flex-shrink-0" />
              <Link
                href={`/practice/${topicSlug}`}
                className="hover:text-[#9898aa] transition-colors flex-shrink-0"
              >
                {topicName}
              </Link>
              <ChevronRight size={12} className="flex-shrink-0" />
              <span className="text-[#9898aa] truncate">
                {question.content}
              </span>
            </nav>

            {/* Question text + level */}
            <div className="flex items-start justify-between gap-3">
              <p className="text-xl sm:text-2xl font-bold text-[#f4f4f6] leading-snug">
                {question.content}
              </p>
              <span
                className={`flex-shrink-0 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${levelStyle.className}`}
              >
                {levelStyle.label}
              </span>
            </div>
          </section>

          {/* Keywords + history + recorder/transcript/evaluation */}
          <PracticeContent
            questionId={questionId}
            keywords={question.answerKeywords}
          />
        </div>
      </div>

      {/* Thanh điều hướng prev/next */}
      <Suspense fallback={null}>
        <PracticeNavFooter
          order={order}
          currentQuestionId={questionId}
          topicSlug={topicSlug}
          questionTitle={question.content}
        />
      </Suspense>
    </main>
  );
}

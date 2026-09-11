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
  title: "Câu hỏi luyện tập phỏng vấn IT - Phỏng vấn IT",
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

  return `${safeText}...`;
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
      title: `${questionTitle} - Phỏng vấn IT`,
      description: questionDescription,
    }),
    alternates: {
      canonical: getPracticeQuestionHref(canonicalTopicSlug, question),
    },
  };
}

export default async function QuestionPage({
  params,
  searchParams,
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
    <main className="flex min-w-0 flex-1 flex-col collection-item-enter overflow-hidden rounded-[28px] border border-[#c4b5fd]/18 bg-[#171d3d]/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_18px_42px_rgba(2,6,23,0.22)]">
      <div className="flex-1 overflow-y-auto">
        <div className="flex w-full flex-col gap-4 px-4 py-5 sm:px-8 lg:px-12">
          <section className="flex flex-col gap-5 rounded-[24px] border border-[#c4b5fd]/16 bg-[#1b2248]/90 px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:px-6">
            <nav className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-[#94a3b8]">
              <Link
                href="/"
                className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 font-semibold transition-colors hover:bg-white/[0.1] hover:text-white"
              >
                Trang chủ
              </Link>
              <ChevronRight size={13} className="text-[#64748b]" />
              <Link
                href={`/practice/${canonicalTopicSlug}`}
                className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 font-semibold text-[#ddd6fe] transition-colors hover:bg-white/[0.1] hover:text-white"
              >
                {topicName}
              </Link>
            </nav>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <h1 className="text-xl font-extrabold leading-snug text-[#f4f4f6] sm:text-2xl">
                {question.content}
              </h1>
              <span
                className={`w-fit flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${levelStyle.className}`}
              >
                {levelStyle.label}
              </span>
            </div>
          </section>

          <PracticeContent questionId={questionId} />
        </div>
      </div>

      <Suspense fallback={null}>
        <PracticeNavFooter
          order={order}
          currentQuestionId={questionId}
          topicSlug={canonicalTopicSlug}
          questionTitle={question.content}
        />
      </Suspense>
    </main>
  );
}

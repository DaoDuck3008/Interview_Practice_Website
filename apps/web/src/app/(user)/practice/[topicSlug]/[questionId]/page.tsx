import { notFound } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getQuestion, getQuestionOrder } from "@/lib/api/questions";
import PracticeContent from "@/components/practice/PracticeContent";
import PracticeNavFooter from "@/components/practice/PracticeNavFooter";
import { formatTopicName } from "@/lib/utils/topics";
import { LEVEL_STYLE } from "@/lib/utils/levels";

export default async function QuestionPage({
  params,
}: {
  params: Promise<{ topicSlug: string; questionId: string }>;
}) {
  const { topicSlug, questionId } = await params;

  const question = await getQuestion(questionId);
  if (!question) notFound();

  const order = await getQuestionOrder(question.topicId);
  const currentIndex = order.findIndex((q) => q.id === questionId);
  const topicName = formatTopicName(topicSlug);
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
              <span className="text-[#9898aa] truncate">{question.content}</span>
            </nav>

            {/* Level + question index */}
            <div className="flex items-center gap-3">
              <span
                className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${levelStyle.className}`}
              >
                {levelStyle.label}
              </span>
              <span className="font-mono text-xs text-[#606072]">
                #{String(currentIndex + 1).padStart(2, "0")} / {order.length}
              </span>
            </div>

            {/* Question text */}
            <p className="text-xl sm:text-2xl font-bold text-[#f4f4f6] leading-snug">
              {question.content}
            </p>
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
        />
      </Suspense>
    </main>
  );
}

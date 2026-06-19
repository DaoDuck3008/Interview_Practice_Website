import { notFound } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getQuestionsByTopic } from "@/lib/api/questions";
import PracticeSidebar from "@/components/practice/PracticeSidebar";
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

  const questions = await getQuestionsByTopic(topicSlug);

  const question = questions.find((q) => q.id === questionId);
  if (!question) notFound();

  const currentIndex = questions.findIndex((q) => q.id === questionId);
  const topicName = formatTopicName(topicSlug);
  const levelStyle = LEVEL_STYLE[question.level];

  return (
    <>
      {/* Sidebar */}
      <Suspense fallback={null}>
        <PracticeSidebar
          questions={questions}
          currentQuestionId={questionId}
          topicSlug={topicSlug}
          topicName={topicName}
        />
      </Suspense>

      {/* Main column */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto flex flex-col divide-y divide-[#1c1c28]">
          {/* Question pane */}
          <section className="px-6 py-5 flex-shrink-0">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-1.5 text-xs text-[#606072] mb-4">
              <Link href="/" className="hover:text-[#9898aa] transition-colors">
                Trang chủ
              </Link>
              <ChevronRight size={12} />
              <Link
                href={`/practice/${topicSlug}`}
                className="hover:text-[#9898aa] transition-colors"
              >
                {topicName}
              </Link>
              <ChevronRight size={12} />
              <span className="text-[#9898aa]">{question.content}</span>
            </nav>

            {/* Level + question index */}
            <div className="flex items-center gap-3 mb-4">
              <span
                className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${levelStyle.className}`}
              >
                {levelStyle.label}
              </span>
              <span className="font-mono text-xs text-[#606072]">
                #{String(currentIndex + 1).padStart(2, "0")} /{" "}
                {questions.length}
              </span>
            </div>

            {/* Question text */}
            <p className="text-xl sm:text-2xl font-bold text-[#f4f4f6] leading-snug">
              {question.content}
            </p>
          </section>

          {/* Keywords (revealed after first answer) + history + recorder/transcript/evaluation */}
          <PracticeContent
            questionId={questionId}
            keywords={question.answerKeywords}
          />
        </div>

        {/* Status bar nav */}
        <Suspense fallback={null}>
          <PracticeNavFooter
            questions={questions}
            currentQuestionId={questionId}
            topicSlug={topicSlug}
          />
        </Suspense>
      </main>
    </>
  );
}

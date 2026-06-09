import { notFound } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getQuestionsByTopic } from "@/lib/api/questions";
import { getSessionsByQuestion } from "@/lib/api/sessions";
import PracticeSidebar from "@/components/practice/PracticeSidebar";
import AnswerHistory from "@/components/practice/AnswerHistory";
import PracticeSession from "@/components/practice/PracticeSession";
import PracticeNavFooter from "@/components/practice/PracticeNavFooter";
import { formatTopicName } from "@/lib/utils/topics";
import { LEVEL_STYLE } from "@/lib/utils/levels";

export default async function QuestionPage({
  params,
}: {
  params: Promise<{ topicSlug: string; questionId: string }>;
}) {
  const { topicSlug, questionId } = await params;

  const [questions, sessions] = await Promise.all([
    getQuestionsByTopic(topicSlug),
    getSessionsByQuestion(questionId),
  ]);

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

            {/* Keywords — revealed after at least one answer */}
            {sessions.length > 0 && question.answerKeywords.length > 0 && (
              <div className="flex flex-col gap-2 mt-5">
                <p className="text-xs text-[#606072] font-mono">$ keywords</p>
                <div className="flex flex-wrap gap-1.5">
                  {question.answerKeywords.map((kw) => (
                    <span
                      key={kw}
                      className="font-mono text-xs px-2.5 py-1 rounded-md border"
                      style={{
                        background: "rgba(124,58,237,0.08)",
                        borderColor: "rgba(124,58,237,0.25)",
                        color: "#a78bfa",
                      }}
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Answer history pane */}
          {sessions.length > 0 && <AnswerHistory sessions={sessions} />}

          {/* Recorder / Transcript / Evaluation panes */}
          <PracticeSession questionId={questionId} />
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

import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowUpRight } from "lucide-react";
import type { Question } from "@/lib/api/questions";
import { LEVEL_STYLE } from "@/lib/utils/levels";
import { getLearningQuestionHref } from "@/lib/utils/question-url";

interface RelatedQuestionListProps {
  title: string;
  description?: string;
  questions: Question[];
  currentQuestionId: string;
  fallbackTopicSlug: string;
  returnHref?: string;
  showTopic?: boolean;
}

export default function RelatedQuestionList({
  title,
  description,
  questions,
  currentQuestionId,
  fallbackTopicSlug,
  returnHref,
  showTopic = false,
}: RelatedQuestionListProps) {
  const visibleQuestions = questions
    .filter((question) => question.id !== currentQuestionId)
    .slice(0, 5);

  return (
    <section className="overflow-hidden rounded-[26px] border border-white/[0.12] bg-[#10162d]/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_16px_42px_rgba(2,6,23,0.2)]">
      <div className="border-b border-white/[0.08] px-4 py-4">
        <h2 className="text-sm font-bold text-[#f4f4f6]">{title}</h2>
        {description && (
          <p className="mt-1 text-xs leading-relaxed text-[#94a3b8]">
            {description}
          </p>
        )}
      </div>

      {visibleQuestions.length > 0 ? (
        <div className="divide-y divide-white/[0.07]">
          {visibleQuestions.map((question, index) => {
            const topicSlug = question.topic?.slug ?? fallbackTopicSlug;
            const levelStyle = LEVEL_STYLE[question.level];
            const href = getLearningQuestionHref(topicSlug, question);
            const detailHref = returnHref
              ? `${href}?${new URLSearchParams({ returnTo: returnHref }).toString()}`
              : href;

            return (
              <Link
                key={question.id}
                href={detailHref}
                className="data-row-enter group flex items-start gap-3 px-4 py-3 transition-[background-color] duration-200 hover:bg-[#1a203d]"
                style={{ "--motion-enter-delay": `${index * 20}ms` } as CSSProperties}
              >
                <span
                  className={`mt-0.5 shrink-0 self-start rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${levelStyle.className}`}
                >
                  {levelStyle.label}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-sm font-semibold leading-snug text-[#cbd5e1] transition-colors group-hover:text-white">
                    {question.content}
                  </span>
                  {showTopic && question.topic?.name && (
                    <span className="mt-1 inline-flex rounded-full border border-white/10 bg-white/[0.045] px-2 py-0.5 text-[11px] font-semibold text-[#94a3b8]">
                      {question.topic.name}
                    </span>
                  )}
                </span>
                <ArrowUpRight
                  size={14}
                  className="mt-0.5 shrink-0 text-[#64748b] transition-colors group-hover:text-[#c4b5fd]"
                />
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="px-4 py-5 text-sm text-[#94a3b8]">
          Chưa có câu hỏi phù hợp.
        </p>
      )}
    </section>
  );
}

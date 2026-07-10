import Link from "next/link";
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
  showTopic?: boolean;
}

export default function RelatedQuestionList({
  title,
  description,
  questions,
  currentQuestionId,
  fallbackTopicSlug,
  showTopic = false,
}: RelatedQuestionListProps) {
  const visibleQuestions = questions
    .filter((question) => question.id !== currentQuestionId)
    .slice(0, 5);

  return (
    <section className="rounded-lg border border-border bg-surface">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-bold text-text-primary">{title}</h2>
        {description && (
          <p className="mt-1 text-xs leading-relaxed text-text-muted">
            {description}
          </p>
        )}
      </div>

      {visibleQuestions.length > 0 ? (
        <div className="divide-y divide-border">
          {visibleQuestions.map((question) => {
            const topicSlug = question.topic?.slug ?? fallbackTopicSlug;
            const levelStyle = LEVEL_STYLE[question.level];

            return (
              <Link
                key={question.id}
                href={getLearningQuestionHref(topicSlug, question)}
                className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-elevated"
              >
                <span
                  className={`mt-0.5 shrink-0 self-start rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${levelStyle.className}`}
                >
                  {levelStyle.label}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-sm font-semibold leading-snug text-text-secondary transition-colors group-hover:text-text-primary">
                    {question.content}
                  </span>
                  {showTopic && question.topic?.name && (
                    <span className="mt-1 block text-xs text-text-muted">
                      {question.topic.name}
                    </span>
                  )}
                </span>
                <ArrowUpRight
                  size={14}
                  className="mt-0.5 shrink-0 text-text-faint transition-colors group-hover:text-accent-light"
                />
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="px-4 py-5 text-sm text-text-muted">
          Chưa có câu hỏi phù hợp.
        </p>
      )}
    </section>
  );
}

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, BookOpen, Mic, Sparkles } from "lucide-react";
import type { Question } from "@/lib/api/questions";
import { LEVEL_STYLE } from "@/lib/utils/levels";
import { getPracticeQuestionHref } from "@/lib/utils/question-url";
import RelatedQuestionList from "./RelatedQuestionList";

interface LearningQuestionDetailProps {
  question: Question;
  sameTopicQuestions: Question[];
  latestQuestions: Question[];
  topicSlug: string;
}

const markdownComponents: React.ComponentProps<
  typeof ReactMarkdown
>["components"] = {
  p: ({ children }) => (
    <p className="mb-4 text-[15px] leading-7 text-text-secondary">{children}</p>
  ),
  h2: ({ children }) => (
    <h2 className="mb-3 mt-7 text-xl font-bold text-text-primary">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-5 text-base font-bold text-text-primary">
      {children}
    </h3>
  ),
  ul: ({ children }) => (
    <ul className="mb-4 list-disc space-y-2 pl-5 text-[15px] leading-7 text-text-secondary">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-4 list-decimal space-y-2 pl-5 text-[15px] leading-7 text-text-secondary">
      {children}
    </ol>
  ),
  li: ({ children }) => <li>{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-5 border-l-2 border-accent px-4 py-2 text-text-secondary">
      {children}
    </blockquote>
  ),
  code: ({ children, className }) => {
    const isBlock = className?.startsWith("language-");

    if (isBlock) {
      return (
        <code className="block overflow-x-auto rounded-lg border border-border bg-base p-4 text-sm leading-6 text-text-secondary">
          {children}
        </code>
      );
    }

    return (
      <code className="rounded-md border border-border bg-elevated px-1.5 py-0.5 text-sm text-accent-light">
        {children}
      </code>
    );
  },
  pre: ({ children }) => <pre className="mb-4 overflow-x-auto">{children}</pre>,
  table: ({ children }) => (
    <div className="mb-4 overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[520px] border-collapse text-sm">
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-border bg-elevated px-3 py-2 text-left font-semibold text-text-primary">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-border px-3 py-2 text-text-secondary">
      {children}
    </td>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-accent-light underline underline-offset-4"
    >
      {children}
    </a>
  ),
};

export default function LearningQuestionDetail({
  question,
  sameTopicQuestions,
  latestQuestions,
  topicSlug,
}: LearningQuestionDetailProps) {
  const topicName = question.topic?.name ?? topicSlug;
  const canonicalTopicSlug = question.topic?.slug ?? topicSlug;
  const levelStyle = LEVEL_STYLE[question.level];
  const backHref = `/learning/${canonicalTopicSlug}/questions`;
  const practiceHref = getPracticeQuestionHref(canonicalTopicSlug, question);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 md:py-8 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <article className="min-w-0 rounded-lg border border-border bg-surface">
        <div className="border-b border-border px-4 py-4 sm:px-6">
          <nav className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
            <Link href={backHref} className="hover:text-text-secondary">
              Câu hỏi
            </Link>
            <span>/</span>
            <span className="text-text-secondary">{topicName}</span>
          </nav>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${levelStyle.className}`}
            >
              {levelStyle.label}
            </span>
            {question.isFeatured && (
              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-elevated px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-accent-light">
                <Sparkles size={12} />
                Nổi bật
              </span>
            )}
          </div>

          <h1 className="mt-4 text-2xl font-extrabold leading-tight text-text-primary sm:text-3xl">
            {question.content}
          </h1>

          {question.answerKeywords.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {question.answerKeywords.map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full border border-border bg-elevated px-3 py-1 text-xs font-semibold text-text-secondary"
                >
                  {keyword}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-5 sm:px-6 sm:py-6">
          {question.answerKeySummary && (
            <section className="mb-6 rounded-lg border border-border bg-elevated p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-text-primary">
                <BookOpen size={16} className="text-accent-light" />
                Tóm tắt đáp án
              </div>
              <p className="text-[15px] leading-7 text-text-secondary">
                {question.answerKeySummary}
              </p>
            </section>
          )}

          <section>
            <h2 className="mb-4 text-lg font-bold text-text-primary">
              Đáp án chi tiết
            </h2>
            {question.detailAnswerKey ? (
              <div className="max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {question.detailAnswerKey}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm text-text-muted">
                Câu hỏi này chưa có đáp án chi tiết.
              </p>
            )}
          </section>

          <div className="mt-8 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row">
            <Link
              href={backHref}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 py-3 text-sm font-semibold text-text-secondary transition-colors hover:bg-elevated hover:text-text-primary"
            >
              <ArrowLeft size={16} />
              Quay lại danh sách
            </Link>
            <Link
              href={practiceHref}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-accent-light"
            >
              <Mic size={16} />
              Luyện tập câu này
            </Link>
          </div>
        </div>
      </article>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
        <RelatedQuestionList
          title="Cùng chủ đề"
          description="Các câu hỏi gần với nội dung bạn đang đọc."
          questions={sameTopicQuestions}
          currentQuestionId={question.id}
          fallbackTopicSlug={canonicalTopicSlug}
        />
        <RelatedQuestionList
          title="Mới thêm"
          description="Một vài câu hỏi khác để tiếp tục ôn tập."
          questions={latestQuestions}
          currentQuestionId={question.id}
          fallbackTopicSlug={canonicalTopicSlug}
          showTopic
        />
      </aside>
    </main>
  );
}

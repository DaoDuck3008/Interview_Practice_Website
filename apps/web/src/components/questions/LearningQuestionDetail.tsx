import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { ArrowLeft, BookOpen, Mic, Sparkles } from "lucide-react";
import type { Question } from "@/lib/api/questions";
import { LEVEL_STYLE } from "@/lib/utils/levels";
import {
  getMarkdownCodeLanguage,
  getMarkdownLanguageLabel,
} from "@/lib/utils/markdown";
import { getPracticeQuestionHref } from "@/lib/utils/question-url";
import RelatedQuestionList from "./RelatedQuestionList";

interface LearningQuestionDetailProps {
  question: Question;
  sameTopicQuestions: Question[];
  latestQuestions: Question[];
  topicSlug: string;
  returnHref?: string;
}

const markdownComponents: React.ComponentProps<
  typeof ReactMarkdown
>["components"] = {
  p: ({ children }) => (
    <p className="mb-4 text-[15px] leading-7 text-[#cbd5e1]">{children}</p>
  ),
  h2: ({ children }) => (
    <h2 className="mb-3 mt-7 text-xl font-bold text-[#f4f4f6]">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-5 text-base font-bold text-[#e9d5ff]">{children}</h3>
  ),
  ul: ({ children }) => (
    <ul className="mb-4 list-disc space-y-2 pl-5 text-[15px] leading-7 text-[#cbd5e1]">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-4 list-decimal space-y-2 pl-5 text-[15px] leading-7 text-[#cbd5e1]">
      {children}
    </ol>
  ),
  li: ({ children }) => <li>{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-5 rounded-2xl border border-[#c4b5fd]/20 bg-white/[0.055] px-4 py-3 text-[#ddd6fe] backdrop-blur-xl">
      {children}
    </blockquote>
  ),
  pre: ({ children }) => <>{children}</>,
  code: ({ children, className }) => {
    const language = getMarkdownCodeLanguage(className);
    const codeStr = String(children).replace(/\n$/, "");

    if (language) {
      const languageLabel = getMarkdownLanguageLabel(language);

      return (
        <div className="mb-4 overflow-hidden rounded-2xl border border-white/10 bg-[#05050d]/90 shadow-[0_18px_44px_rgba(2,6,23,0.26)]">
          <div className="border-b border-white/10 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-[#c4b5fd]">
            {languageLabel}
          </div>
          <SyntaxHighlighter
            language={language}
            style={oneDark}
            customStyle={{
              background: "#05050d",
              border: 0,
              borderRadius: 0,
              margin: 0,
              padding: "16px",
              fontSize: "14px",
              lineHeight: "1.7",
            }}
            codeTagProps={{
              style: { fontFamily: "var(--font-mono, monospace)" },
            }}
          >
            {codeStr}
          </SyntaxHighlighter>
        </div>
      );
    }

    if (codeStr.includes("\n")) {
      return (
        <pre
          className="mb-4 overflow-x-auto rounded-2xl border border-white/10 bg-[#05050d]/90 p-4 text-sm leading-7 text-[#cbd5e1]"
          style={{ fontFamily: "var(--font-mono, monospace)" }}
        >
          <code>{codeStr}</code>
        </pre>
      );
    }

    return (
      <code className="rounded-md border border-[#c4b5fd]/20 bg-[#7c3aed]/15 px-1.5 py-0.5 text-sm text-[#c4b5fd]">
        {children}
      </code>
    );
  },
  table: ({ children }) => (
    <div className="mb-4 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.035]">
      <table className="w-full min-w-[520px] border-collapse text-sm">
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-white/10 bg-white/[0.06] px-3 py-2 text-left font-semibold text-[#f4f4f6]">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-white/[0.07] px-3 py-2 text-[#cbd5e1]">
      {children}
    </td>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-[#c4b5fd] underline underline-offset-4 transition-colors hover:text-white"
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
  returnHref,
}: LearningQuestionDetailProps) {
  const topicName = question.topic?.name ?? topicSlug;
  const canonicalTopicSlug = question.topic?.slug ?? topicSlug;
  const levelStyle = LEVEL_STYLE[question.level];
  const backHref = returnHref ?? `/learning/${canonicalTopicSlug}/questions`;
  const practiceHref = getPracticeQuestionHref(canonicalTopicSlug, question);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5 md:px-6 md:py-7 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <article className="min-w-0 overflow-hidden rounded-[30px] border border-white/[0.13] bg-[#0f172a]/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_24px_70px_rgba(2,6,23,0.28)] backdrop-blur-2xl">
        <div className="border-b border-white/[0.08] px-4 py-5 sm:px-6">
          {/* Keep the detail page visually tied to the learning list shell. */}
          <nav className="flex flex-wrap items-center gap-2 text-xs text-[#94a3b8]">
            <Link
              href={backHref}
              className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 font-semibold transition-colors hover:bg-white/[0.11] hover:text-white"
            >
              Câu hỏi
            </Link>
            <span className="text-[#64748b]">/</span>
            <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 font-semibold text-[#ddd6fe]">
              {topicName}
            </span>
          </nav>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${levelStyle.className}`}
            >
              {levelStyle.label}
            </span>
            {question.isFeatured && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#c4b5fd]/25 bg-[#7c3aed]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#c4b5fd]">
                <Sparkles size={12} />
                Nổi bật
              </span>
            )}
          </div>

          <h1 className="mt-4 text-2xl font-extrabold leading-tight text-[#f4f4f6] sm:text-3xl">
            {question.content}
          </h1>

          {question.answerKeywords.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {question.answerKeywords.map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-xs font-semibold text-[#cbd5e1] backdrop-blur-xl"
                >
                  {keyword}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-5 sm:px-6 sm:py-6">
          {question.answerKeySummary && (
            <section className="mb-6 rounded-[24px] border border-white/10 bg-white/[0.055] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[#f4f4f6]">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#c4b5fd]/25 bg-[#7c3aed]/15 text-[#c4b5fd]">
                  <BookOpen size={16} />
                </span>
                Tóm tắt đáp án
              </div>
              <p className="text-[15px] leading-7 text-[#cbd5e1]">
                {question.answerKeySummary}
              </p>
            </section>
          )}

          <section id="answer">
            <h2 className="mb-4 text-lg font-bold text-[#f4f4f6]">
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
              <p className="text-sm text-[#94a3b8]">
                Câu hỏi này chưa có đáp án chi tiết.
              </p>
            )}
          </section>

          <div className="mt-8 flex flex-col gap-3 border-t border-white/[0.08] pt-5 sm:flex-row">
            <Link
              href={backHref}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-[#e9d5ff] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-[#c4b5fd]/35 hover:bg-white/[0.11] hover:text-white"
            >
              <ArrowLeft size={16} />
              Quay lại danh sách
            </Link>
            <Link
              href={practiceHref}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#c4b5fd]/30 bg-[#7c3aed]/25 px-4 py-3 text-sm font-bold text-white shadow-[0_0_24px_rgba(124,58,237,0.18)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-[#ddd6fe]/55 hover:bg-[rgba(139,92,246,0.3)]"
            >
              <Mic size={16} />
              Luyện tập câu này
            </Link>
          </div>
        </div>
      </article>

      <aside className="flex flex-col gap-3 lg:sticky ">
        <RelatedQuestionList
          title="Cùng chủ đề"
          description="Các câu hỏi gần với nội dung bạn đang đọc."
          questions={sameTopicQuestions}
          currentQuestionId={question.id}
          fallbackTopicSlug={canonicalTopicSlug}
          returnHref={backHref}
        />
        <RelatedQuestionList
          title="Mới thêm"
          description="Một vài câu hỏi khác để tiếp tục ôn tập."
          questions={latestQuestions}
          currentQuestionId={question.id}
          fallbackTopicSlug={canonicalTopicSlug}
          returnHref={backHref}
          showTopic
        />
      </aside>
    </main>
  );
}

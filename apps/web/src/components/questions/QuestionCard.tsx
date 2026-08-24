"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  ArrowUpRight,
  BookOpen,
  Bookmark,
  ChevronDown,
  Star,
} from "lucide-react";
import { getQuestion, type Question } from "@/lib/api/questions";
import { LEVEL_STYLE } from "@/lib/utils/levels";
import {
  getMarkdownCodeLanguage,
  getMarkdownLanguageLabel,
} from "@/lib/utils/markdown";
import {
  getLearningQuestionHref,
  getPracticeQuestionHref,
} from "@/lib/utils/question-url";
import { useAuthStore } from "@/stores/auth.store";
import { useFavoritesStore } from "@/stores/favorites.store";

interface QuestionCardProps {
  question: Question;
  index: number;
  searchQuery?: string;
  /** Gọi sau khi bỏ lưu thành công để trang /saved xóa item khỏi danh sách ngay. */
  onFavoriteRemoved?: (questionId: string) => void;
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function HighlightText({ text, query }: { text: string; query?: string }) {
  if (!query?.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRegex(query)})`, "gi"));

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={i}
            className="rounded-sm px-0.5"
            style={{ background: "rgba(250,204,21,0.2)", color: "#fde68a" }}
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

const mdComponents: React.ComponentProps<typeof ReactMarkdown>["components"] = {
  p: ({ children }) => (
    <p className="mb-2 text-sm leading-relaxed text-[#c4c4d4]">{children}</p>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 mt-3 text-sm font-bold text-[#f4f4f6]">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1 mt-2 text-sm font-semibold text-[#e4e4f0]">
      {children}
    </h3>
  ),
  ul: ({ children }) => (
    <ul className="mb-2 list-inside list-disc space-y-0.5 pl-1 text-sm leading-relaxed text-[#c4c4d4]">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 list-inside list-decimal space-y-0.5 pl-1 text-sm leading-relaxed text-[#c4c4d4]">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  pre: ({ children }) => <>{children}</>,
  code: ({ children, className }) => {
    const language = getMarkdownCodeLanguage(className);
    const codeStr = String(children).replace(/\n$/, "");

    if (language) {
      const languageLabel = getMarkdownLanguageLabel(language);

      return (
        <div className="mb-2 overflow-hidden rounded-xl border border-white/10 bg-[#05050d]/90">
          <div className="border-b border-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#a78bfa]">
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
              padding: "12px 14px",
              fontSize: "12px",
              lineHeight: "1.6",
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
          className="mb-2 overflow-x-auto rounded-xl border border-white/10 bg-[#05050d]/90 p-3 text-xs leading-6 text-[#c4c4d4]"
          style={{ fontFamily: "var(--font-mono, monospace)" }}
        >
          <code>{codeStr}</code>
        </pre>
      );
    }

    return (
      <code className="rounded bg-[#1e1c2e] px-1.5 py-0.5 font-mono text-xs text-[#a78bfa]">
        {children}
      </code>
    );
  },
  table: ({ children }) => (
    <div className="mb-3 overflow-x-auto rounded-xl border border-white/15 bg-black/25 shadow-inner shadow-black/20">
      <table className="w-full min-w-[640px] border-collapse text-sm leading-6">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-white/[0.08]">{children}</thead>
  ),
  tbody: ({ children }) => (
    <tbody className="[&>tr:nth-child(even)]:bg-black/20 [&>tr:hover]:bg-white/[0.035] [&>tr]:transition-colors">
      {children}
    </tbody>
  ),
  th: ({ children }) => (
    <th className="border-b border-r border-white/15 px-3 py-2.5 text-left font-bold text-white last:border-r-0">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-r border-white/[0.11] px-3 py-2.5 align-top text-[#d4d4e0] last:border-r-0">
      {children}
    </td>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-[#f4f4f6]">{children}</strong>
  ),
  em: ({ children }) => <em className="italic text-[#c4c4d4]">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="my-2 rounded-2xl border border-[#7c3aed]/25 bg-white/[0.04] px-3 py-2 text-sm italic text-[#9898aa]">
      {children}
    </blockquote>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#a78bfa] underline underline-offset-2 transition-colors hover:text-[#c4b5fd]"
    >
      {children}
    </a>
  ),
};

export default function QuestionCard({
  question,
  index,
  searchQuery,
  onFavoriteRemoved,
}: QuestionCardProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [fullAnswer, setFullAnswer] = useState(question.detailAnswerKey ?? "");
  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [answerError, setAnswerError] = useState(false);
  const levelStyle = LEVEL_STYLE[question.level];
  const topicSlug = question.topic?.slug ?? "";

  const loggedIn = useAuthStore((s) => s.hydrated && !!s.user);
  const isFavorited = useFavoritesStore((s) => s.ids.has(question.id));
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const currentQuery = searchParams.toString();
  const returnTo = `${pathname}${currentQuery ? `?${currentQuery}` : ""}`;

  function getDetailHref() {
    const href = getLearningQuestionHref(topicSlug, question);
    const params = new URLSearchParams({ returnTo });

    // Preserve list filters/page when users return from the detail screen.
    return `${href}?${params.toString()}`;
  }

  async function handleToggleFavorite(e: React.SyntheticEvent) {
    e.preventDefault();
    e.stopPropagation();
    const wasFavorited = isFavorited;
    await toggleFavorite(question);
    if (wasFavorited) onFavoriteRemoved?.(question.id);
  }

  async function loadFullAnswer() {
    if (fullAnswer || loadingAnswer) return;

    setLoadingAnswer(true);
    setAnswerError(false);
    try {
      const detail = await getQuestion(question.id);
      setFullAnswer(detail?.detailAnswerKey ?? "");
      if (!detail?.detailAnswerKey) setAnswerError(true);
    } catch {
      setAnswerError(true);
    } finally {
      setLoadingAnswer(false);
    }
  }

  function handleToggleOpen() {
    setOpen((value) => {
      const next = !value;

      // Detail answer is fetched lazily only when the user expands this card.
      if (next) void loadFullAnswer();
      return next;
    });
  }

  return (
    <article
      className="group overflow-hidden rounded-[24px] border backdrop-blur-2xl transition-all duration-300 hover:-translate-y-0.5"
      style={{
        borderColor: open ? "rgba(196,181,253,0.28)" : "rgba(255,255,255,0.11)",
        background: open ? "rgba(48, 25, 98, 0.80)" : "rgba(9, 14, 29, 0.40)",
        boxShadow: open
          ? "inset 0 1px 0 rgba(255,255,255,0.12), 0 22px 54px rgba(76,29,149,0.16)"
          : "inset 0 1px 0 rgba(255,255,255,0.08), 0 14px 40px rgba(2,6,23,0.18)",
      }}
    >
      <div className="flex w-full items-start gap-3 px-4 py-3.5 text-left sm:gap-4 sm:px-5">
        <button
          type="button"
          onClick={handleToggleOpen}
          className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 text-left sm:gap-4"
        >
          {question.isFeatured && (
            <Star size={14} className="mt-1 flex-shrink-0 text-[#fbbf24]" />
          )}

          <span className="mt-0.5 w-5 flex-shrink-0 text-right font-mono text-[11px] text-[#94a3b8]">
            #{index}
          </span>

          <p className="min-w-0 flex-1 text-[14px] font-bold leading-6 text-[#d4d4e0] transition-colors duration-200 group-hover:text-[#f4f4f6]">
            <HighlightText text={question.content} query={searchQuery} />
          </p>
        </button>

        <div className="flex flex-shrink-0 items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${levelStyle.className}`}
          >
            {levelStyle.label}
          </span>

          {loggedIn && (
            <button
              type="button"
              onClick={handleToggleFavorite}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/[0.055] transition-all duration-200 hover:bg-white/[0.11]"
              style={{ color: isFavorited ? "#fbbf24" : "#606072" }}
              title={isFavorited ? "Bỏ lưu" : "Lưu câu hỏi"}
            >
              <Bookmark
                size={14}
                fill={isFavorited ? "currentColor" : "none"}
              />
            </button>
          )}

          {topicSlug && (
            <Link
              href={getDetailHref()}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.055] text-[#94a3b8] transition-all duration-200 hover:border-[#c4b5fd]/40 hover:bg-white/[0.11] hover:text-[#c4b5fd]"
              title="Xem chi tiết"
              aria-label="Xem chi tiết"
            >
              <BookOpen size={14} />
            </Link>
          )}

          <button
            type="button"
            onClick={handleToggleOpen}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/[0.055] text-[#94a3b8] transition-all duration-200 hover:bg-white/[0.11] hover:text-[#c4b5fd]"
            title={open ? "Thu gọn" : "Mở đáp án"}
            aria-label={open ? "Thu gọn" : "Mở đáp án"}
          >
            <ChevronDown
              size={15}
              className="transition-transform duration-200"
              style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-white/[0.06] px-5 pb-5 pt-3 sm:px-10 lg:px-16">
          {fullAnswer ? (
            <div className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
              <ReactMarkdown
                components={mdComponents}
                remarkPlugins={[remarkGfm]}
              >
                {fullAnswer}
              </ReactMarkdown>
            </div>
          ) : loadingAnswer ? (
            <p className="text-sm text-[#a78bfa]">Đang tải đáp án...</p>
          ) : answerError ? (
            <p className="text-sm text-[#94a3b8]">
              Chưa tải được đáp án. Bạn có thể mở trang chi tiết để xem tiếp.
            </p>
          ) : (
            <p className="text-sm italic text-[#606072]">
              Chưa có đáp án chi tiết.
            </p>
          )}

          {topicSlug && (
            <div className="mt-4 flex flex-col gap-2 border-t border-white/[0.06] pt-4 sm:flex-row sm:justify-end">
              <Link
                href={getDetailHref()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-[#e9d5ff] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-[#c4b5fd]/35 hover:bg-white/[0.11] sm:w-auto"
              >
                Xem chi tiết
                <BookOpen size={14} />
              </Link>
              <Link
                href={getPracticeQuestionHref(topicSlug, question)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#c4b5fd]/30 bg-[#7c3aed]/20 px-4 py-2 text-sm font-semibold text-[#f4f4f6] shadow-[0_0_22px_rgba(124,58,237,0.12)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-[#ddd6fe]/55 hover:bg-[rgba(139,92,246,0.24)] sm:w-auto"
              >
                Luyện tập
                <ArrowUpRight size={14} />
              </Link>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

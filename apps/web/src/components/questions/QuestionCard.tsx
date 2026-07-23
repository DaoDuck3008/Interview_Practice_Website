"use client";

import { useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  BookOpen,
  ChevronDown,
  ArrowUpRight,
  Star,
  Bookmark,
} from "lucide-react";
import type { Question } from "@/lib/api/questions";
import { LEVEL_STYLE } from "@/lib/utils/levels";
import {
  getMarkdownCodeLanguage,
  getMarkdownLanguageLabel,
} from "@/lib/utils/markdown";
import {
  getLearningQuestionHref,
  getPracticeQuestionHref,
} from "@/lib/utils/question-url";
import { getQuestion } from "@/lib/api/questions";
import { useAuthStore } from "@/stores/auth.store";
import { useFavoritesStore } from "@/stores/favorites.store";

interface QuestionCardProps {
  question: Question;
  index: number;
  searchQuery?: string;
  /** Gọi sau khi bỏ lưu thành công — dùng để trang /saved xóa item khỏi danh sách ngay. */
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
    <p className="text-sm text-[#c4c4d4] mb-2 leading-relaxed">{children}</p>
  ),
  h2: ({ children }) => (
    <h2 className="text-sm font-bold text-[#f4f4f6] mb-2 mt-3">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold text-[#e4e4f0] mb-1 mt-2">
      {children}
    </h3>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-inside text-sm text-[#c4c4d4] space-y-0.5 mb-2 pl-1">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside text-sm text-[#c4c4d4] space-y-0.5 mb-2 pl-1">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  pre: ({ children }) => <>{children}</>,
  code: ({ children, className }) => {
    const language = getMarkdownCodeLanguage(className);
    const codeStr = String(children).replace(/\n$/, "");

    // Block code với language → SyntaxHighlighter
    if (language) {
      const languageLabel = getMarkdownLanguageLabel(language);

      return (
        <div className="mb-2 overflow-hidden rounded-lg border border-[#1c1c28] bg-[#05050d]">
          <div className="border-b border-[#1c1c28] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#a78bfa]">
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

    // Block code không có language (chứa newline) → giữ pre-formatting
    if (codeStr.includes("\n")) {
      return (
        <pre
          className="text-xs overflow-x-auto mb-2"
          style={{
            background: "#05050d",
            border: "1px solid #1c1c28",
            borderRadius: "8px",
            padding: "12px 14px",
            fontFamily: "var(--font-mono, monospace)",
            lineHeight: "1.6",
            color: "#c4c4d4",
          }}
        >
          <code>{codeStr}</code>
        </pre>
      );
    }

    // Inline code
    return (
      <code className="bg-[#1e1c2e] text-[#a78bfa] px-1.5 py-0.5 rounded text-xs font-mono">
        {children}
      </code>
    );
  },
  strong: ({ children }) => (
    <strong className="text-[#f4f4f6] font-semibold">{children}</strong>
  ),
  em: ({ children }) => <em className="text-[#c4c4d4] italic">{children}</em>,
  del: ({ children }) => (
    <del className="text-[#606072] line-through">{children}</del>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#8b5cf6] hover:text-[#a78bfa] underline underline-offset-2 transition-colors duration-100"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-[#7c3aed]/40 pl-3 text-[#9898aa] italic text-sm my-2">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto mb-3">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead style={{ background: "rgba(124,58,237,0.12)" }}>{children}</thead>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      {children}
    </tr>
  ),
  th: ({ children }) => (
    <th
      className="text-left px-3 py-2 text-xs font-semibold text-[#c4b5fd] uppercase tracking-wide"
      style={{ borderBottom: "1px solid rgba(124,58,237,0.2)" }}
    >
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 text-[#c4c4d4]">{children}</td>
  ),
};

export default function QuestionCard({
  question,
  index,
  searchQuery,
  onFavoriteRemoved,
}: QuestionCardProps) {
  const [open, setOpen] = useState(false);
  const [fullAnswer, setFullAnswer] = useState(question.detailAnswerKey ?? "");
  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [answerError, setAnswerError] = useState(false);
  const levelStyle = LEVEL_STYLE[question.level];
  const topicSlug = question.topic?.slug ?? "";

  const loggedIn = useAuthStore((s) => s.hydrated && !!s.user);
  const isFavorited = useFavoritesStore((s) => s.ids.has(question.id));
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);

  async function handleToggleFavorite(e: React.SyntheticEvent) {
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
      if (next) void loadFullAnswer();
      return next;
    });
  }

  return (
    <div
      className="overflow-hidden rounded-[24px] border backdrop-blur-2xl transition-all duration-300 hover:-translate-y-0.5"
      style={{
        borderColor: open
          ? "rgba(196,181,253,0.28)"
          : "rgba(255,255,255,0.11)",
        background: open
          ? "rgba(76, 29, 149, 0.26)"
          : "rgba(15, 23, 42, 0.52)",
        boxShadow: open
          ? "inset 0 1px 0 rgba(255,255,255,0.12), 0 22px 54px rgba(76,29,149,0.16)"
          : "inset 0 1px 0 rgba(255,255,255,0.08), 0 14px 40px rgba(2,6,23,0.18)",
      }}
    >
      {/* Row */}
      <button
        onClick={handleToggleOpen}
        className="group flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left sm:gap-4 sm:px-6"
      >
        {/* Featured crown */}
        {question.isFeatured && (
          <Star size={14} className="flex-shrink-0 text-[#fbbf24]" />
        )}

        {/* Index */}
        <span className="w-5 flex-shrink-0 text-right font-mono text-[11px] text-[#94a3b8]">
          #{index}
        </span>

        {/* Content */}
        <p className="min-w-0 flex-1 truncate text-[14px] font-bold text-[#d4d4e0] transition-colors duration-200 group-hover:text-[#f4f4f6]">
          <HighlightText text={question.content} query={searchQuery} />
        </p>

        {/* Level badge */}
        <span
          className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${levelStyle.className}`}
        >
          {levelStyle.label}
        </span>

        {/* Bookmark toggle — chỉ hiện khi đã đăng nhập.
            Dùng span[role=button] thay vì <button> thật vì hàng cha (Row) đã
            là một <button> — lồng button trong button là HTML không hợp lệ,
            trình duyệt sẽ tự đóng button cha sớm và phá vỡ cả hàng. */}
        {loggedIn && (
          <span
            role="button"
            tabIndex={0}
            onClick={handleToggleFavorite}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleToggleFavorite(e);
              }
            }}
            className="flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/[0.055] transition-all duration-200 hover:bg-white/[0.11]"
            style={{ color: isFavorited ? "#fbbf24" : "#606072" }}
            title={isFavorited ? "Bỏ lưu" : "Lưu câu hỏi"}
          >
            <Bookmark size={14} fill={isFavorited ? "currentColor" : "none"} />
          </span>
        )}

        {/* Detail link */}
        {topicSlug && (
          <Link
            href={getLearningQuestionHref(topicSlug, question)}
            onClick={(e) => e.stopPropagation()}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.055] text-[#94a3b8] transition-all duration-200 hover:border-[#c4b5fd]/40 hover:bg-white/[0.11] hover:text-[#c4b5fd]"
            title="Xem chi tiết"
          >
            <BookOpen size={14} />
          </Link>
        )}

        {/* Chevron */}
        <ChevronDown
          size={14}
          className="flex-shrink-0 text-[#94a3b8] transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {/* Expanded answer */}
      {open && (
        <div
          className="border-t px-5 pb-5 pt-3 sm:px-10 lg:px-16"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
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
            <p className="text-sm text-[#606072] italic">
              Chưa có đáp án chi tiết.
            </p>
          )}

          {question.answerKeywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {question.answerKeywords.map((kw) => (
                <span
                  key={kw}
                  className="rounded-full border px-2.5 py-0.5 font-mono text-xs"
                  style={{
                    background: "rgba(124,58,237,0.07)",
                    borderColor: "rgba(124,58,237,0.2)",
                    color: "#a78bfa",
                  }}
                >
                  {kw}
                </span>
              ))}
            </div>
          )}

          {topicSlug && (
            <div
              className="mt-4 flex flex-col gap-2 border-t pt-4 sm:flex-row sm:justify-end"
              style={{ borderColor: "rgba(255,255,255,0.06)" }}
            >
              {/* Separate CTAs make the read-next and practice paths obvious. */}
              <Link
                href={getLearningQuestionHref(topicSlug, question)}
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
    </div>
  );
}

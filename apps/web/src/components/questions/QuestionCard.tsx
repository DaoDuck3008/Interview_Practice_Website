"use client";

import { useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { ChevronDown, ArrowUpRight, Crown } from "lucide-react";
import type { Question } from "@/lib/api/questions";
import { LEVEL_STYLE } from "@/lib/utils/levels";

interface QuestionCardProps {
  question: Question;
  index: number;
  searchQuery?: string;
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
    const match = /language-(\w+)/.exec(className ?? "");
    const codeStr = String(children).replace(/\n$/, "");

    // Block code với language → SyntaxHighlighter
    if (match) {
      return (
        <SyntaxHighlighter
          language={match[1]}
          style={oneDark}
          customStyle={{
            background: "#05050d",
            border: "1px solid #1c1c28",
            borderRadius: "8px",
            padding: "12px 14px",
            marginBottom: "8px",
            fontSize: "12px",
            lineHeight: "1.6",
          }}
          codeTagProps={{
            style: { fontFamily: "var(--font-mono, monospace)" },
          }}
        >
          {codeStr}
        </SyntaxHighlighter>
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
  em: ({ children }) => (
    <em className="text-[#c4c4d4] italic">{children}</em>
  ),
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
}: QuestionCardProps) {
  const [open, setOpen] = useState(false);
  const levelStyle = LEVEL_STYLE[question.level];
  const topicSlug = question.topic?.slug ?? "";

  return (
    <div
      className="rounded-xl border overflow-hidden transition-all duration-150"
      style={{
        borderColor: open ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.07)",
        background: open ? "#1c1a2c" : "#141320",
        boxShadow: open ? "0 0 20px rgba(124,58,237,0.06)" : "none",
      }}
    >
      {/* Row */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3.5 text-left cursor-pointer group"
      >
        {/* Featured crown */}
        {question.isFeatured && (
          <Crown size={14} className="flex-shrink-0 text-[#fbbf24]" />
        )}

        {/* Index */}
        <span className="flex-shrink-0 font-mono text-[11px] text-[#606072] w-5 text-right">
          #{index}
        </span>

        {/* Content */}
        <p className="flex-1 min-w-0 truncate text-[14px] text-[#d4d4e0] font-bold group-hover:text-[#f4f4f6] transition-colors duration-100">
          <HighlightText text={question.content} query={searchQuery} />
        </p>

        {/* Level badge */}
        <span
          className={`flex-shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md ${levelStyle.className}`}
        >
          {levelStyle.label}
        </span>

        {/* Practice link */}
        {topicSlug && (
          <Link
            href={`/practice/${topicSlug}/${question.id}`}
            onClick={(e) => e.stopPropagation()}
            className="flex-shrink-0 text-[#606072] hover:text-[#8b5cf6] transition-colors duration-100"
            title="Luyện tập"
          >
            <ArrowUpRight size={14} />
          </Link>
        )}

        {/* Chevron */}
        <ChevronDown
          size={14}
          className="flex-shrink-0 text-[#606072] transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {/* Expanded answer */}
      {open && (
        <div
          className="px-5 sm:px-10 lg:px-16 pb-5 pt-3 border-t"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          {question.detailAnswerKey ? (
            <div className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
              <ReactMarkdown
                components={mdComponents}
                remarkPlugins={[remarkGfm]}
              >
                {question.detailAnswerKey}
              </ReactMarkdown>
            </div>
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
                  className="font-mono text-xs px-2 py-0.5 rounded border"
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
        </div>
      )}
    </div>
  );
}

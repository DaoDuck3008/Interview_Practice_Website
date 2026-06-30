"use client";

import { useState } from "react";
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  FileText,
  History,
  Mic,
  MessageSquareQuote,
  Wand2,
} from "lucide-react";
import type { Session } from "@/lib/api/sessions";
import { formatDate, formatDuration } from "@/lib/utils/format";

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[#606072] w-20 shrink-0 font-mono">{label}</span>
      <div className="flex-1 h-1 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
        <div
          className="h-full bg-[#7c3aed] transition-all duration-700"
          style={{ width: `${value * 10}%` }}
        />
      </div>
      <span className="font-mono text-xs font-bold text-[#a78bfa] w-8 text-right">
        {value}/10
      </span>
    </div>
  );
}

function SessionCard({
  session,
  index,
  defaultOpen = false,
}: {
  session: Session;
  index: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className="border overflow-hidden transition-colors duration-200"
      style={{
        background: "rgba(255,255,255,0.025)",
        borderColor: "rgba(255,255,255,0.06)",
        borderRadius: 12,
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left cursor-pointer hover:bg-white/[0.03] transition-colors duration-200"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)" }}
          >
            <Mic size={11} className="text-[#8b5cf6]" />
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-xs font-medium text-[#f4f4f6]">
              lần {index + 1}
            </span>
            <span className="font-mono text-[10px] text-[#606072]">
              {formatDate(session.createdAt)} · {formatDuration(session.duration)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {session.score && (
            <div className="flex items-baseline gap-0.5">
              <span className="font-mono text-sm font-bold text-[#8b5cf6]">
                {Math.round(
                  (session.score.technicalScore +
                    session.score.completenessScore +
                    session.score.clarityScore) /
                    3
                )}
              </span>
              <span className="font-mono text-xs text-[#606072]">/10</span>
            </div>
          )}
          {open ? (
            <ChevronUp size={13} className="text-[#606072]" />
          ) : (
            <ChevronDown size={13} className="text-[#606072]" />
          )}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 flex flex-col gap-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {session.transcript && (
            <div className="pt-4">
              <p className="flex items-center gap-1.5 text-xs text-[#9898aa] mb-2">
                <FileText size={12} className="text-[#606072]" />
                Phiên âm
              </p>
              <p className="font-mono text-sm text-[#9898aa] leading-relaxed">{session.transcript}</p>
            </div>
          )}

          {session.score && (
            <div className="flex flex-col gap-2.5">
              <p className="flex items-center gap-1.5 text-xs text-[#9898aa]">
                <BarChart3 size={12} className="text-[#606072]" />
                Điểm số
              </p>
              <ScoreBar label="Kỹ thuật" value={session.score.technicalScore} />
              <ScoreBar label="Đầy đủ" value={session.score.completenessScore} />
              <ScoreBar label="Rõ ràng" value={session.score.clarityScore} />
            </div>
          )}

          {session.score?.summary && (
            <blockquote className="border-l-2 border-[#7c3aed] pl-3 flex flex-col gap-1">
              <p className="flex items-center gap-1.5 text-xs text-[#9898aa]">
                <MessageSquareQuote size={12} className="text-[#606072]" />
                Nhận xét
              </p>
              <p className="text-sm text-[#9898aa] leading-relaxed">{session.score.summary}</p>
            </blockquote>
          )}

          {session.improvement && (
            <div
              className="rounded-lg p-3 flex flex-col gap-1.5"
              style={{
                background: "rgba(245,158,11,0.06)",
                border: "1px solid rgba(245,158,11,0.2)",
              }}
            >
              <p className="flex items-center gap-1.5 text-xs font-medium text-[#f59e0b]">
                <Wand2 size={12} />
                Phiên bản cải thiện
              </p>
              <p className="text-sm text-[#9898aa] leading-relaxed whitespace-pre-wrap">
                {session.improvement.improvedAnswer}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface Props {
  sessions: Session[];
}

export default function AnswerHistory({ sessions }: Props) {
  const [showAll, setShowAll] = useState(false);

  if (sessions.length === 0) return null;

  const recent = sessions[sessions.length - 1];
  const older = sessions.slice(0, -1);

  return (
    <section className="flex flex-col gap-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-[#9898aa]">
        <History size={13} className="text-[#606072]" />
        Lịch sử ({sessions.length})
      </p>

      {older.length > 0 && (
        <div className="flex flex-col gap-2">
          {older.length > 1 && !showAll ? (
            <button
              onClick={() => setShowAll(true)}
              className="w-full font-mono text-xs text-[#606072] hover:text-[#9898aa] py-2 border border-dashed cursor-pointer transition-colors duration-200"
              style={{ borderColor: "rgba(255,255,255,0.1)", borderRadius: 8 }}
            >
              + {older.length} lần trước
            </button>
          ) : (
            <>
              {older.map((s, i) => (
                <SessionCard key={s.id} session={s} index={i} />
              ))}
              {older.length > 1 && (
                <button
                  onClick={() => setShowAll(false)}
                  className="font-mono text-xs text-[#606072] hover:text-[#9898aa] cursor-pointer transition-colors duration-200 py-1"
                >
                  thu gọn
                </button>
              )}
            </>
          )}
        </div>
      )}

      <SessionCard
        session={recent}
        index={sessions.length - 1}
        defaultOpen
      />
    </section>
  );
}

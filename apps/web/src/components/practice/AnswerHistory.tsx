"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Mic } from "lucide-react";
import type { Session } from "@/lib/api/sessions";
import { formatDate, formatDuration } from "@/lib/utils/format";

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[#606072] w-20 shrink-0 font-mono">{label}</span>
      <div className="flex-1 h-1 bg-[#1c1c28] overflow-hidden">
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

function SessionCard({ session, index }: { session: Session; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="border overflow-hidden transition-colors duration-200"
      style={{ background: "#0d0d14", borderColor: "#1c1c28", borderRadius: 8 }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left cursor-pointer hover:bg-[#13131c] transition-colors duration-200"
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
        <div className="px-4 pb-4 flex flex-col gap-4" style={{ borderTop: "1px solid #1c1c28" }}>
          {session.transcript && (
            <div className="pt-4">
              <p className="text-xs text-[#606072] font-mono mb-2">transcript</p>
              <p className="font-mono text-sm text-[#9898aa] leading-relaxed">{session.transcript}</p>
            </div>
          )}

          {session.score && (
            <div className="flex flex-col gap-2.5">
              <p className="text-xs text-[#606072] font-mono">scores</p>
              <ScoreBar label="Kỹ thuật" value={session.score.technicalScore} />
              <ScoreBar label="Đầy đủ" value={session.score.completenessScore} />
              <ScoreBar label="Rõ ràng" value={session.score.clarityScore} />
              {session.score.hasExample && (
                <span className="self-start text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/30">
                  Có ví dụ ✓
                </span>
              )}
            </div>
          )}

          {session.score?.feedback && (
            <blockquote className="border-l-2 border-[#7c3aed] pl-3 flex flex-col gap-1">
              <p className="text-xs text-[#606072] font-mono">nhận xét</p>
              <p className="text-sm text-[#9898aa] leading-relaxed">{session.score.feedback}</p>
            </blockquote>
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
    <section className="px-6 py-4 flex flex-col gap-3">
      <p className="text-xs text-[#606072] font-mono">
        $ history ({sessions.length})
      </p>

      {older.length > 0 && (
        <div className="flex flex-col gap-2">
          {older.length > 1 && !showAll ? (
            <button
              onClick={() => setShowAll(true)}
              className="w-full font-mono text-xs text-[#606072] hover:text-[#9898aa] py-2 border border-dashed cursor-pointer transition-colors duration-200"
              style={{ borderColor: "#1c1c28", borderRadius: 6 }}
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

      <SessionCard session={recent} index={sessions.length - 1} />
    </section>
  );
}

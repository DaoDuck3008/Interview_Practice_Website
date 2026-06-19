"use client";

import { useEffect, useState } from "react";
import { getSessionsByQuestion } from "@/lib/api/sessions";
import type { Session } from "@/lib/api/sessions";
import AnswerHistory from "@/components/practice/AnswerHistory";
import PracticeSession from "@/components/practice/PracticeSession";

interface Props {
  questionId: string;
  keywords: string[];
}

/**
 * Sessions phải fetch ở client: token auth nằm trong Zustand store (chỉ có ở
 * trình duyệt), fetch từ Server Component sẽ luôn nhận 401 -> mảng rỗng.
 */
export default function PracticeContent({ questionId, keywords }: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    getSessionsByQuestion(questionId).then(setSessions);
  }, [questionId]);

  return (
    <>
      {sessions.length > 0 && keywords.length > 0 && (
        <section className="px-6 py-5">
          <div className="flex flex-col gap-2">
            <p className="text-xs text-[#606072] font-mono">$ keywords</p>
            <div className="flex flex-wrap gap-1.5">
              {keywords.map((kw) => (
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
        </section>
      )}

      {sessions.length > 0 && <AnswerHistory sessions={sessions} />}

      <PracticeSession
        questionId={questionId}
        onSessionSaved={(session) =>
          setSessions((prev) => [...prev, session])
        }
      />
    </>
  );
}

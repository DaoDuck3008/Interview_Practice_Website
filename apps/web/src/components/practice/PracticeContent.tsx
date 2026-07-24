"use client";

import { useEffect, useState } from "react";
import { getSessionsByQuestion } from "@/lib/api/sessions";
import type { Session } from "@/lib/api/sessions";
import { useAuthStore } from "@/stores/auth.store";
import AnswerHistory from "@/components/practice/AnswerHistory";
import PracticeSession from "@/components/practice/PracticeSession";

interface Props {
  questionId: string;
}

/**
 * Sessions phải fetch ở client vì token auth nằm trong Zustand store.
 * Fetch từ Server Component sẽ không có token và dễ trả về danh sách rỗng.
 */
export default function PracticeContent({ questionId }: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const hydrated = useAuthStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) return;
    getSessionsByQuestion(questionId).then(setSessions);
  }, [questionId, hydrated]);

  return (
    <>
      {sessions.length > 0 && <AnswerHistory sessions={sessions} />}

      <PracticeSession
        questionId={questionId}
        onSessionSaved={(session) =>
          setSessions((prev) => {
            const idx = prev.findIndex((s) => s.id === session.id);
            if (idx === -1) return [...prev, session];
            const next = [...prev];
            next[idx] = session;
            return next;
          })
        }
      />
    </>
  );
}

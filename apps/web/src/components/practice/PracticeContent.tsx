"use client";

import { useEffect, useState } from "react";
import { Tags } from "lucide-react";
import { getSessionsByQuestion } from "@/lib/api/sessions";
import type { Session } from "@/lib/api/sessions";
import { useAuthStore } from "@/stores/auth.store";
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
  const hydrated = useAuthStore((s) => s.hydrated);

  // Chờ AuthHydrator refresh token xong (hydrated) mới fetch — nếu fetch ngay lúc
  // mount thì token chưa có trong store -> request bị 401 -> trả [] -> lịch sử
  // không hiện cho tới khi trả lời. Khi hydrated bật true, token đã được set.
  useEffect(() => {
    if (!hydrated) return;
    getSessionsByQuestion(questionId).then(setSessions);
  }, [questionId, hydrated]);

  return (
    <>
      {sessions.length > 0 && keywords.length > 0 && (
        // Từ khóa
        <section></section>
        // <section
        //   className="rounded-2xl px-5 py-5"
        //   style={{
        //     background: "rgba(255,255,255,0.025)",
        //     border: "1px solid rgba(255,255,255,0.06)",
        //   }}
        // >
        //   <div className="flex flex-col gap-3">
        //     <p className="flex items-center gap-1.5 text-xs font-medium text-[#9898aa]">
        //       <Tags size={13} className="text-[#8b5cf6]" />
        //       Từ khóa
        //     </p>
        //     <div className="flex flex-wrap gap-1.5">
        //       {keywords.map((kw) => (
        //         <span
        //           key={kw}
        //           className="font-mono text-xs px-2.5 py-1 rounded-md border"
        //           style={{
        //             background: "rgba(124,58,237,0.08)",
        //             borderColor: "rgba(124,58,237,0.25)",
        //             color: "#a78bfa",
        //           }}
        //         >
        //           {kw}
        //         </span>
        //       ))}
        //     </div>
        //   </div>
        // </section>
      )}

      {/* Lịch sử câu trả lời */}
      {sessions.length > 0 && <AnswerHistory sessions={sessions} />}

      <PracticeSession
        questionId={questionId}
        onSessionSaved={(session) =>
          setSessions((prev) => {
            const idx = prev.findIndex((s) => s.id === session.id);
            if (idx === -1) return [...prev, session];
            const next = [...prev];
            next[idx] = session; // cập nhật (vd thêm improvement) thay vì nhân đôi
            return next;
          })
        }
      />
    </>
  );
}

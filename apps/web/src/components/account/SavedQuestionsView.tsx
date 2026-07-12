"use client";

import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import QuestionCard from "@/components/questions/QuestionCard";
import LearningPagination from "@/components/questions/LearningPagination";
import {
  getFavoritesPaginated,
  type FavoriteQuestion,
} from "@/lib/api/favorites";
import type { Paginated } from "@/lib/api/questions";

const cardClass =
  "rounded-2xl p-6 md:p-8 backdrop-blur-xl border border-white/10 w-full";
const cardBg = { background: "rgba(255,255,255,0.05)" };

const LIMIT = 10;

export default function SavedQuestionsView() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<FavoriteQuestion> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    queueMicrotask(() => {
      setLoading(true);
      getFavoritesPaginated({ page, limit: LIMIT })
        .then(setData)
        .finally(() => setLoading(false));
    });
  }, [page]);

  function handleRemoved(questionId: string) {
    setData((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.filter((q) => q.id !== questionId),
            total: Math.max(0, prev.total - 1),
          }
        : prev,
    );
  }

  return (
    <div className={cardClass} style={cardBg}>
      <h3 className="text-lg font-bold text-text-primary">
        Câu hỏi đã lưu
      </h3>

      <div
        className={`mt-4 flex flex-col gap-2 ${loading ? "opacity-50" : ""}`}
      >
        {!data || data.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16">
            <Bookmark size={24} className="text-text-muted" />
            <p className="text-sm text-text-muted">
              {loading
                ? "Đang tải…"
                : "Bạn chưa lưu câu hỏi nào. Bấm biểu tượng bookmark trên câu hỏi để lưu lại."}
            </p>
          </div>
        ) : (
          data.items.map((question, i) => (
            <QuestionCard
              key={question.id}
              question={question}
              index={(data.page - 1) * data.limit + i + 1}
              onFavoriteRemoved={handleRemoved}
            />
          ))
        )}
      </div>

      {data && (
        <LearningPagination
          page={data.page}
          totalPages={data.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

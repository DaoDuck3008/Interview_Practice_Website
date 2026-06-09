"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import QuestionForm from "@/components/admin/QuestionForm";
import {
  getQuestionAdmin,
  updateQuestion,
  type QuestionInput,
} from "@/lib/api/questions";

export default function EditQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [initial, setInitial] = useState<QuestionInput | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getQuestionAdmin(id)
      .then((q) =>
        setInitial({
          topicId: q.topicId,
          content: q.content,
          detailAnswerKey: q.detailAnswerKey,
          answerKeySummary: q.answerKeySummary,
          answerKeywords: q.answerKeywords,
          level: q.level,
        }),
      )
      .catch(() => setNotFound(true));
  }, [id]);

  return (
    <div>
      <Link
        href="/admin/questions"
        className="inline-flex items-center gap-1.5 text-sm text-[#606072] hover:text-[#9898aa] transition-colors mb-4"
      >
        <ArrowLeft size={14} />
        Câu hỏi
      </Link>
      <h2 className="text-2xl font-bold text-[#f4f4f6] mb-6">Sửa câu hỏi</h2>

      {notFound ? (
        <p className="text-sm text-[#ef4444]">Không tìm thấy câu hỏi.</p>
      ) : !initial ? (
        <div className="flex items-center gap-2 text-[#606072] py-8">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : (
        <QuestionForm
          initial={initial}
          onSubmit={(input) => updateQuestion(id, input)}
          submitLabel="Lưu thay đổi"
        />
      )}
    </div>
  );
}

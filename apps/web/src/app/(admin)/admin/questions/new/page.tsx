"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import QuestionForm from "@/components/admin/QuestionForm";
import { createQuestion } from "@/lib/api/questions";

export default function NewQuestionPage() {
  return (
    <div>
      <Link
        href="/admin/questions"
        className="inline-flex items-center gap-1.5 text-sm text-[#606072] hover:text-[#9898aa] transition-colors mb-4"
      >
        <ArrowLeft size={14} />
        Câu hỏi
      </Link>
      <h2 className="text-2xl font-bold text-[#f4f4f6] mb-6">Thêm câu hỏi</h2>
      <QuestionForm onSubmit={createQuestion} submitLabel="Tạo câu hỏi" />
    </div>
  );
}

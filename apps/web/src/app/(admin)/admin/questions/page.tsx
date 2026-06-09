"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import {
  getAllQuestionsAdmin,
  deleteQuestion,
  updateQuestion,
  LEVELS,
  type Question,
  type Level,
} from "@/lib/api/questions";
import { getTopics, type Topic } from "@/lib/api/topics";

const selectStyle = { background: "#0d0d14", border: "1px solid #1c1c28" };
const selectClass =
  "px-3 py-2 rounded-lg text-sm text-[#f4f4f6] outline-none cursor-pointer";

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  const [topicFilter, setTopicFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState<"" | Level>("");

  async function load() {
    setLoading(true);
    try {
      const [q, t] = await Promise.all([
        getAllQuestionsAdmin(),
        getTopics().catch(() => []),
      ]);
      setQuestions(q);
      setTopics(t);
    } catch {
      toast.error("Không tải được danh sách câu hỏi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () =>
      questions.filter(
        (q) =>
          (!topicFilter || q.topicId === topicFilter) &&
          (!levelFilter || q.level === levelFilter),
      ),
    [questions, topicFilter, levelFilter],
  );

  async function handleDelete(q: Question) {
    if (!confirm("Ẩn câu hỏi này khỏi danh sách luyện tập?")) return;
    try {
      await deleteQuestion(q.id);
      toast.success("Đã ẩn câu hỏi.");
      await load();
    } catch {
      toast.error("Không thể ẩn câu hỏi.");
    }
  }

  async function handleRestore(q: Question) {
    try {
      await updateQuestion(q.id, { isActive: true });
      toast.success("Đã khôi phục câu hỏi.");
      await load();
    } catch {
      toast.error("Không thể khôi phục câu hỏi.");
    }
  }

  return (
    <div className="">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#f4f4f6]">Câu hỏi</h2>
          <p className="text-sm text-[#606072] mt-1">
            Quản lý ngân hàng câu hỏi luyện tập.
          </p>
        </div>
        <Link
          href="/admin/questions/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors duration-200 cursor-pointer"
          style={{
            background: "#7c3aed",
            boxShadow: "0 0 14px rgba(124,58,237,0.3)",
          }}
        >
          <Plus size={16} />
          Thêm câu hỏi
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <select
          value={topicFilter}
          onChange={(e) => setTopicFilter(e.target.value)}
          className={selectClass}
          style={selectStyle}
        >
          <option value="">Tất cả chủ đề</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id} className="bg-[#0d0d14]">
              {t.name}
            </option>
          ))}
        </select>
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value as "" | Level)}
          className={selectClass}
          style={selectStyle}
        >
          <option value="">Tất cả cấp độ</option>
          {LEVELS.map((l) => (
            <option key={l.value} value={l.value} className="bg-[#0d0d14]">
              {l.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl border border-[#1c1c28] bg-[#0d0d14] overflow-hidden">
        <div className="grid grid-cols-[1fr_140px_90px_90px_90px] gap-4 px-5 py-3 border-b border-[#1c1c28] text-xs font-medium uppercase tracking-wider text-[#606072]">
          <span>Nội dung</span>
          <span>Chủ đề</span>
          <span>Cấp độ</span>
          <span>Trạng thái</span>
          <span className="text-right">Thao tác</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-[#606072]">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-16 text-sm text-[#606072]">
            Không có câu hỏi nào.
          </p>
        ) : (
          filtered.map((q) => (
            <div
              key={q.id}
              className="grid grid-cols-[1fr_140px_90px_90px_90px] gap-4 px-5 py-3.5 border-b border-[#1c1c28] last:border-0 items-center hover:bg-[#13131c] transition-colors duration-150"
            >
              <span
                className="text-sm text-[#f4f4f6] truncate"
                title={q.content}
              >
                {q.content}
              </span>
              <span className="text-sm text-[#9898aa] truncate">
                {q.topic?.name ?? "—"}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8b5cf6]">
                {q.level}
              </span>
              <span>
                {q.isActive ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/30">
                    Hiển thị
                  </span>
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#606072]/10 text-[#606072] border border-[#606072]/30">
                    Đã ẩn
                  </span>
                )}
              </span>
              <div className="flex items-center justify-end gap-1">
                <Link
                  href={`/admin/questions/${q.id}/edit`}
                  className="p-2 rounded-md text-[#606072] hover:text-[#8b5cf6] hover:bg-[#1c1c28] transition-colors cursor-pointer"
                  aria-label="Sửa"
                >
                  <Pencil size={15} />
                </Link>
                {q.isActive ? (
                  <button
                    onClick={() => handleDelete(q)}
                    className="p-2 rounded-md text-[#606072] hover:text-[#ef4444] hover:bg-[#1c1c28] transition-colors cursor-pointer"
                    aria-label="Ẩn"
                  >
                    <Trash2 size={15} />
                  </button>
                ) : (
                  <button
                    onClick={() => handleRestore(q)}
                    className="p-2 rounded-md text-[#606072] hover:text-[#22c55e] hover:bg-[#1c1c28] transition-colors cursor-pointer"
                    aria-label="Khôi phục"
                  >
                    <RotateCcw size={15} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

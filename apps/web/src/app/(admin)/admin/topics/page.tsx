"use client";

import { useEffect, useState, FormEvent } from "react";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import {
  getTopics,
  createTopic,
  updateTopic,
  deleteTopic,
  type Topic,
} from "@/lib/api/topics";
import { getAllQuestionsAdmin } from "@/lib/api/questions";
import Modal from "@/components/admin/Modal";

const inputStyle = { background: "#0d0d14", border: "1px solid #1c1c28" };
const inputClass =
  "w-full px-4 py-3 rounded-lg text-sm text-[#f4f4f6] placeholder-[#3d3d54] outline-none transition-all";

function onFocus(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = "#7c3aed";
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.15)";
}
function onBlur(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = "#1c1c28";
  e.currentTarget.style.boxShadow = "none";
}

export default function AdminTopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Topic | null>(null);
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [t, questions] = await Promise.all([
        getTopics(),
        getAllQuestionsAdmin().catch(() => []),
      ]);
      setTopics(t);
      const c: Record<string, number> = {};
      for (const q of questions) c[q.topicId] = (c[q.topicId] ?? 0) + 1;
      setCounts(c);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setSlug("");
    setName("");
    setError("");
    setModalOpen(true);
  }

  function openEdit(topic: Topic) {
    setEditing(topic);
    setSlug(topic.slug);
    setName(topic.name);
    setError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!slug.trim() || !name.trim()) {
      setError("Vui lòng điền đầy đủ slug và tên.");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(slug.trim())) {
      setError("Slug chỉ gồm chữ thường, số và dấu gạch ngang.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateTopic(editing.id, { slug: slug.trim(), name: name.trim() });
        toast.success("Đã cập nhật chủ đề.");
      } else {
        await createTopic({ slug: slug.trim(), name: name.trim() });
        toast.success("Đã tạo chủ đề.");
      }
      setModalOpen(false);
      await load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(msg || "Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(topic: Topic) {
    if (!confirm(`Xóa chủ đề "${topic.name}"?`)) return;
    try {
      await deleteTopic(topic.id);
      toast.success("Đã xóa chủ đề.");
      await load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      toast.error(msg || "Không thể xóa chủ đề.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#f4f4f6]">Chủ đề</h2>
          <p className="text-sm text-[#606072] mt-1">
            Quản lý các chủ đề luyện tập.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors duration-200 cursor-pointer"
          style={{
            background: "#7c3aed",
            boxShadow: "0 0 14px rgba(124,58,237,0.3)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#6d28d9")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#7c3aed")}
        >
          <Plus size={16} />
          Thêm chủ đề
        </button>
      </div>

      <div className="rounded-2xl border border-[#1c1c28] bg-[#0d0d14] overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 px-5 py-3 border-b border-[#1c1c28] text-xs font-medium uppercase tracking-wider text-[#606072]">
          <span>Tên</span>
          <span>Slug</span>
          <span className="text-right w-20">Câu hỏi</span>
          <span className="text-right w-20">Thao tác</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-[#606072]">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : topics.length === 0 ? (
          <p className="text-center py-16 text-sm text-[#606072]">
            Chưa có chủ đề nào.
          </p>
        ) : (
          topics.map((topic) => (
            <div
              key={topic.id}
              className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 px-5 py-3.5 border-b border-[#1c1c28] last:border-0 items-center hover:bg-[#13131c] transition-colors duration-150"
            >
              <span className="text-sm text-[#f4f4f6] truncate">
                {topic.name}
              </span>
              <span className="text-sm font-mono text-[#9898aa] truncate">
                {topic.slug}
              </span>
              <span className="text-sm text-[#9898aa] text-right w-20">
                {counts[topic.id] ?? 0}
              </span>
              <div className="flex items-center justify-end gap-1 w-20">
                <button
                  onClick={() => openEdit(topic)}
                  className="p-2 rounded-md text-[#606072] hover:text-[#8b5cf6] hover:bg-[#1c1c28] transition-colors cursor-pointer"
                  aria-label="Sửa"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => handleDelete(topic)}
                  className="p-2 rounded-md text-[#606072] hover:text-[#ef4444] hover:bg-[#1c1c28] transition-colors cursor-pointer"
                  aria-label="Xóa"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Sửa chủ đề" : "Thêm chủ đề"}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#9898aa]">Tên</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="JavaScript"
              className={inputClass}
              style={inputStyle}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#9898aa]">Slug</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="javascript"
              className={`${inputClass} font-mono`}
              style={inputStyle}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>

          {error && <p className="text-sm text-[#ef4444]">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2.5 rounded-lg text-sm text-[#9898aa] hover:text-[#f4f4f6] transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors duration-200 cursor-pointer disabled:opacity-60"
              style={{ background: "#7c3aed" }}
            >
              {saving && <Loader2 size={15} className="animate-spin" />}
              {editing ? "Lưu" : "Tạo"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

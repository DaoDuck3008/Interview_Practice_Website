"use client";

import { useEffect, useState, FormEvent } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  getTopicsAdmin,
  createTopic,
  updateTopic,
  deleteTopic,
  type Topic,
  type TopicWithCount,
  type TopicSortBy,
  type SortOrder,
} from "@/lib/api/topics";
import type { Paginated } from "@/lib/api/questions";
import Modal from "@/components/admin/Modal";
import Pagination from "@/components/admin/Pagination";
import { useStatusModal } from "@/components/ui/useStatusModal";

const inputStyle = { background: "#0d0d14", border: "1px solid #1c1c28" };
const inputClass =
  "w-full px-4 py-3 rounded-lg text-sm text-[#f4f4f6] placeholder-[#3d3d54] outline-none transition-all";

const controlStyle = { background: "#0d0d14", border: "1px solid #1c1c28" };
const selectClass =
  "px-3 py-2 rounded-lg text-sm text-[#f4f4f6] outline-none cursor-pointer";

const SORT_OPTIONS: { value: TopicSortBy; label: string }[] = [
  { value: "name", label: "Tên" },
  { value: "slug", label: "Slug" },
  { value: "questions", label: "Số câu hỏi" },
];

const EMPTY: Paginated<TopicWithCount> = {
  items: [],
  total: 0,
  page: 1,
  limit: 30,
  totalPages: 1,
};

function onFocus(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = "#7c3aed";
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.15)";
}
function onBlur(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = "#1c1c28";
  e.currentTarget.style.boxShadow = "none";
}

export default function AdminTopicsPage() {
  const [data, setData] = useState<Paginated<TopicWithCount>>(EMPTY);
  const [loading, setLoading] = useState(true);

  const { confirm, statusModal } = useStatusModal();

  // Bộ lọc + sắp xếp
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<TopicSortBy>("name");
  const [order, setOrder] = useState<SortOrder>("asc");

  // Phân trang
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(30);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Topic | null>(null);
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Debounce search, đồng thời reset về trang 1
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  async function load() {
    setLoading(true);
    try {
      const res = await getTopicsAdmin({
        search: debouncedSearch || undefined,
        sortBy,
        order,
        page,
        limit,
      });
      // Nếu trang hiện tại trống (vd. vừa xóa item cuối) thì lùi về trang trước
      if (res.items.length === 0 && res.page > 1) {
        setPage(res.page - 1);
        return;
      }
      setData(res);
    } catch {
      toast.error("Không tải được danh sách chủ đề.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, sortBy, order, page, limit]);

  function resetToFirstPage<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }

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

  async function handleDelete(topic: TopicWithCount) {
    const ok = await confirm({
      type: "error",
      title: `Xóa chủ đề "${topic.name}"?`,
      message: "Hành động này không thể hoàn tác.",
      confirmText: "Xóa",
    });
    if (!ok) return;
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#606072] pointer-events-none"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc slug…"
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm text-[#f4f4f6] placeholder-[#3d3d54] outline-none"
            style={controlStyle}
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-sm text-[#606072]">Sắp xếp:</span>
          <select
            value={sortBy}
            onChange={(e) =>
              resetToFirstPage(setSortBy)(e.target.value as TopicSortBy)
            }
            className={selectClass}
            style={controlStyle}
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value} className="bg-[#0d0d14]">
                {s.label}
              </option>
            ))}
          </select>
          <button
            onClick={() =>
              resetToFirstPage(setOrder)(order === "asc" ? "desc" : "asc")
            }
            className="p-2 rounded-lg text-[#9898aa] hover:text-[#f4f4f6] hover:bg-[#1c1c28] transition-colors cursor-pointer"
            style={controlStyle}
            aria-label={order === "asc" ? "Tăng dần" : "Giảm dần"}
            title={order === "asc" ? "Tăng dần" : "Giảm dần"}
          >
            {order === "asc" ? <ArrowUp size={15} /> : <ArrowDown size={15} />}
          </button>
        </div>
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
        ) : data.items.length === 0 ? (
          <p className="text-center py-16 text-sm text-[#606072]">
            Không có chủ đề nào khớp bộ lọc.
          </p>
        ) : (
          data.items.map((topic) => (
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
                {topic.questionCount}
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

        {!loading && data.total > 0 && (
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(l) => {
              setLimit(l);
              setPage(1);
            }}
          />
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

      {statusModal}
    </div>
  );
}

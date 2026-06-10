"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  Loader2,
  Search,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  getAllQuestionsAdmin,
  deleteQuestion,
  updateQuestion,
  LEVELS,
  type Paginated,
  type Question,
  type Level,
  type QuestionSortBy,
  type SortOrder,
} from "@/lib/api/questions";
import { getTopics, type Topic } from "@/lib/api/topics";
import Pagination from "@/components/admin/Pagination";
import { useStatusModal } from "@/components/ui/useStatusModal";

const controlStyle = { background: "#0d0d14", border: "1px solid #1c1c28" };
const selectClass =
  "px-3 py-2 rounded-lg text-sm text-[#f4f4f6] outline-none cursor-pointer";

type StatusFilter = "" | "active" | "hidden";

const SORT_OPTIONS: { value: QuestionSortBy; label: string }[] = [
  { value: "topic", label: "Chủ đề" },
  { value: "level", label: "Cấp độ" },
  { value: "content", label: "Nội dung" },
  { value: "status", label: "Trạng thái" },
];

const EMPTY: Paginated<Question> = {
  items: [],
  total: 0,
  page: 1,
  limit: 30,
  totalPages: 1,
};

export default function AdminQuestionsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [data, setData] = useState<Paginated<Question>>(EMPTY);
  const [loading, setLoading] = useState(true);

  const { confirm, statusModal } = useStatusModal();

  // Bộ lọc
  const [topicFilter, setTopicFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState<"" | Level>("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [search, setSearch] = useState("");

  // Giá trị ô text đã debounce
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Sắp xếp
  const [sortBy, setSortBy] = useState<QuestionSortBy>("topic");
  const [order, setOrder] = useState<SortOrder>("asc");

  // Phân trang
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(30);

  // Tải danh sách topic cho dropdown
  useEffect(() => {
    getTopics()
      .then(setTopics)
      .catch(() => setTopics([]));
  }, []);

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
      const res = await getAllQuestionsAdmin({
        topicId: topicFilter || undefined,
        level: levelFilter || undefined,
        status: statusFilter || undefined,
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
      toast.error("Không tải được danh sách câu hỏi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [
    topicFilter,
    levelFilter,
    statusFilter,
    debouncedSearch,
    sortBy,
    order,
    page,
    limit,
  ]);

  function resetToFirstPage<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }

  async function handleDelete(q: Question) {
    const ok = await confirm({
      type: "alert",
      title: "Ẩn câu hỏi?",
      message: "Câu hỏi sẽ bị ẩn khỏi danh sách luyện tập. Bạn có thể khôi phục lại sau.",
      confirmText: "Ẩn",
    });
    if (!ok) return;
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
    <div>
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
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#606072] pointer-events-none"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm từ khóa trong câu hỏi…"
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm text-[#f4f4f6] placeholder-[#3d3d54] outline-none"
            style={controlStyle}
          />
        </div>

        <select
          value={topicFilter}
          onChange={(e) => resetToFirstPage(setTopicFilter)(e.target.value)}
          className={selectClass}
          style={controlStyle}
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
          onChange={(e) =>
            resetToFirstPage(setLevelFilter)(e.target.value as "" | Level)
          }
          className={selectClass}
          style={controlStyle}
        >
          <option value="">Tất cả cấp độ</option>
          {LEVELS.map((l) => (
            <option key={l.value} value={l.value} className="bg-[#0d0d14]">
              {l.label}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) =>
            resetToFirstPage(setStatusFilter)(e.target.value as StatusFilter)
          }
          className={selectClass}
          style={controlStyle}
        >
          <option value="">Mọi trạng thái</option>
          <option value="active" className="bg-[#0d0d14]">
            Đang hiển thị
          </option>
          <option value="hidden" className="bg-[#0d0d14]">
            Đã ẩn
          </option>
        </select>

        {/* Sắp xếp */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-[#606072]">Sắp xếp:</span>
          <select
            value={sortBy}
            onChange={(e) =>
              resetToFirstPage(setSortBy)(e.target.value as QuestionSortBy)
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
        ) : data.items.length === 0 ? (
          <p className="text-center py-16 text-sm text-[#606072]">
            Không có câu hỏi nào khớp bộ lọc.
          </p>
        ) : (
          data.items.map((q) => (
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

      {statusModal}
    </div>
  );
}

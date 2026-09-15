"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Braces, Loader2, Pencil, Search, Tags, Trash2, XCircle } from "lucide-react";
import { toast } from "react-toastify";
import Modal from "@/components/admin/Modal";
import Pagination from "@/components/admin/Pagination";
import { useStatusModal } from "@/components/ui/useStatusModal";
import { deleteAdminTechnicalTerm, getAdminTechnicalTerms, getAdminTechnicalTermStats, updateAdminTechnicalTerm, type AdminTechnicalTerm, type PaginatedTechnicalTerms, type TechnicalTermStats } from "@/lib/api/explanations";
import { formatNumber } from "@/lib/utils/format";

const controlStyle = { background: "#0d0d14", border: "1px solid #1c1c28" };
const EMPTY: PaginatedTechnicalTerms = { items: [], total: 0, page: 1, limit: 30, totalPages: 1 };
const STATUSES: Array<{ value: AdminTechnicalTerm["status"]; label: string }> = [{ value: "PENDING", label: "Đang xử lý" }, { value: "READY", label: "Sẵn sàng" }, { value: "FAILED", label: "Lỗi" }, { value: "MERGED", label: "Đã gộp" }, { value: "DISABLED", label: "Đã tắt" }];

function statusClass(status: AdminTechnicalTerm["status"]) {
  if (status === "READY") return "border-success/30 bg-success/10 text-success";
  if (status === "PENDING") return "border-accent/30 bg-accent/10 text-accent-light";
  if (status === "DISABLED" || status === "FAILED") return "border-danger/30 bg-danger/10 text-danger";
  return "border-border bg-elevated text-text-muted";
}

export default function AdminTechnicalTermsPage() {
  const [data, setData] = useState<PaginatedTechnicalTerms>(EMPTY);
  const [stats, setStats] = useState<TechnicalTermStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<"" | AdminTechnicalTerm["status"]>("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(30);
  const [editing, setEditing] = useState<AdminTechnicalTerm | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { confirm, statusModal } = useStatusModal();

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  /** Server thực hiện search/filter/pagination để bảng vẫn nhẹ khi glossary lớn. */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAdminTechnicalTerms({ search: debouncedSearch || undefined, status: status || undefined, page, limit });
      if (result.items.length === 0 && result.page > 1) { setPage(result.page - 1); return; }
      setData(result);
    } catch { toast.error("Không tải được glossary."); }
    finally { setLoading(false); }
  }, [debouncedSearch, status, page, limit]);

  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);

  useEffect(() => {
    getAdminTechnicalTermStats().then(setStats).catch(() => setStats(null));
  }, []);

  async function setDisabled(term: AdminTechnicalTerm) {
    try { await updateAdminTechnicalTerm(term.id, { status: "DISABLED" }); toast.success("Đã tắt thuật ngữ."); await load(); }
    catch { toast.error("Không thể tắt thuật ngữ."); }
  }

  /** Chỉ term đã tắt mới được xóa; backend cũng lặp lại kiểm tra này để tránh xóa nhầm. */
  async function hardDelete(term: AdminTechnicalTerm) {
    setDeletingId(term.id);
    try { await deleteAdminTechnicalTerm(term.id); toast.success("Đã xóa vĩnh viễn thuật ngữ."); await Promise.all([load(), getAdminTechnicalTermStats().then(setStats)]); }
    catch { toast.error("Không thể xóa thuật ngữ."); }
    finally { setDeletingId(null); }
  }

  /** Mở modal xác nhận trước khi gọi thao tác xóa không thể hoàn tác. */
  async function confirmHardDelete(term: AdminTechnicalTerm) {
    const accepted = await confirm({ type: "error", title: `Xóa vĩnh viễn “${term.canonicalTerm}”?`, message: "Thuật ngữ, định nghĩa và các biến thể liên quan sẽ bị xóa. Hành động này không thể hoàn tác.", confirmText: "Xóa vĩnh viễn", cancelText: "Hủy" });
    if (accepted) await hardDelete(term);
  }

  async function save() {
    if (!editing) return;
    try {
      await updateAdminTechnicalTerm(editing.id, { canonicalTerm: editing.canonicalTerm, explanation: editing.explanation, aliases: editing.aliases.map((alias) => alias.originalAlias).filter(Boolean), status: editing.status });
      toast.success("Đã lưu thuật ngữ."); setEditing(null); await Promise.all([load(), getAdminTechnicalTermStats().then(setStats)]);
    } catch { toast.error("Không thể lưu thuật ngữ."); }
  }

  return <div>
    <div className="mb-6"><h2 className="text-2xl font-bold text-text-primary">Glossary thuật ngữ</h2><p className="mt-1 text-sm text-text-muted">Quản lý các định nghĩa kỹ thuật dùng chung.</p></div>
    <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
      {[{ label: "Tổng thuật ngữ", value: stats?.totalTerms, icon: Braces }, { label: "Tổng aliases", value: stats?.totalAliases, icon: Tags }, { label: "Input tokens", value: stats?.totalInputTokens, icon: ArrowDownToLine }, { label: "Output tokens", value: stats?.totalOutputTokens, icon: ArrowUpFromLine }].map(({ label, value, icon: Icon }) => <div key={label} className="rounded-2xl border border-border bg-surface px-4 py-3"><div className="mb-2 flex items-center justify-between"><p className="text-xs text-text-muted">{label}</p><Icon size={15} className="text-text-faint" /></div>{value === undefined ? <div className="h-7 w-20 animate-pulse rounded bg-elevated" /> : <p className="text-xl font-bold text-text-primary">{formatNumber(value)}</p>}</div>)}
    </div>
    <div className="mb-4 flex flex-wrap items-center gap-3"><div className="relative min-w-[220px] flex-1"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm thuật ngữ…" className="w-full rounded-lg py-2 pl-9 pr-3 text-sm text-text-primary outline-none placeholder:text-text-faint" style={controlStyle} /></div><select value={status} onChange={(event) => { setStatus(event.target.value as typeof status); setPage(1); }} className="cursor-pointer rounded-lg px-3 py-2 text-sm text-text-primary outline-none" style={controlStyle}><option value="">Mọi trạng thái</option>{STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
    <div className="overflow-hidden rounded-2xl border border-border bg-surface"><div className="grid grid-cols-[minmax(180px,1.1fr)_minmax(220px,1.7fr)_130px_110px_120px] gap-4 border-b border-border px-5 py-3 text-xs font-medium uppercase tracking-wider text-text-muted"><span>Thuật ngữ</span><span>Giải thích</span><span>Aliases</span><span>Trạng thái</span><span className="text-right">Thao tác</span></div>
      {loading ? <div className="flex justify-center py-16 text-text-muted"><Loader2 size={18} className="animate-spin" /></div> : data.items.length === 0 ? <p className="py-16 text-center text-sm text-text-muted">Không có thuật ngữ nào khớp bộ lọc.</p> : data.items.map((term) => <div key={term.id} className="grid grid-cols-[minmax(180px,1.1fr)_minmax(220px,1.7fr)_130px_110px_120px] items-center gap-4 border-b border-border px-5 py-3.5 last:border-0 transition-colors hover:bg-elevated"><p className="truncate text-sm font-semibold text-text-primary" title={term.canonicalTerm}>{term.canonicalTerm}</p><p className="truncate text-sm text-text-secondary" title={term.explanation}>{term.explanation || "—"}</p><p className="truncate text-xs text-text-muted" title={term.aliases.map((alias) => alias.originalAlias).join(", ")}>{term.aliases.length || "—"}</p><span className={`w-fit rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${statusClass(term.status)}`}>{STATUSES.find((item) => item.value === term.status)?.label ?? term.status}</span><div className="flex items-center justify-end gap-1"><button onClick={() => setEditing({ ...term, aliases: [...term.aliases] })} className="cursor-pointer rounded-md p-2 text-text-muted transition-colors hover:bg-border hover:text-accent-light" aria-label="Sửa" title="Sửa"><Pencil size={15} /></button>{term.status !== "DISABLED" ? <button onClick={() => void setDisabled(term)} className="cursor-pointer rounded-md p-2 text-text-muted transition-colors hover:bg-border hover:text-danger" aria-label="Tắt" title="Tắt"><XCircle size={15} /></button> : <button onClick={() => void confirmHardDelete(term)} disabled={deletingId === term.id} className="cursor-pointer rounded-md p-2 text-text-muted transition-colors hover:bg-border hover:text-danger disabled:cursor-wait disabled:opacity-50" aria-label="Xóa vĩnh viễn" title="Xóa vĩnh viễn">{deletingId === term.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}</button>}</div></div>)}
      {!loading && data.total > 0 && <Pagination page={data.page} totalPages={data.totalPages} total={data.total} limit={limit} onPageChange={setPage} onLimitChange={(nextLimit) => { setLimit(nextLimit); setPage(1); }} />}</div>
    <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title="Sửa thuật ngữ"><div className="space-y-4"><label className="block text-xs text-text-muted">Canonical term<input value={editing?.canonicalTerm ?? ""} onChange={(event) => setEditing((term) => term ? { ...term, canonicalTerm: event.target.value } : term)} className="mt-1.5 w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-primary outline-none focus:border-accent" /></label><label className="block text-xs text-text-muted">Aliases (phân cách bởi dấu phẩy)<input value={editing?.aliases.map((alias) => alias.originalAlias).join(", ") ?? ""} onChange={(event) => setEditing((term) => term ? { ...term, aliases: event.target.value.split(",").map((value, index) => ({ id: `${term.id}-${index}`, originalAlias: value.trim() })).filter((alias) => alias.originalAlias) } : term)} className="mt-1.5 w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-primary outline-none focus:border-accent" /></label><label className="block text-xs text-text-muted">Giải thích<textarea value={editing?.explanation ?? ""} onChange={(event) => setEditing((term) => term ? { ...term, explanation: event.target.value } : term)} rows={4} className="mt-1.5 w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm leading-6 text-text-primary outline-none focus:border-accent" /></label><div className="flex justify-end gap-2"><button onClick={() => setEditing(null)} className="cursor-pointer rounded-md px-3 py-2 text-sm text-text-secondary hover:text-text-primary">Hủy</button><button onClick={() => void save()} className="cursor-pointer rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-light">Lưu thay đổi</button></div></div></Modal>
    {statusModal}
  </div>;
}

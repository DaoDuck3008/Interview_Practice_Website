"use client";

import { useEffect, useState, FormEvent } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Power,
  Infinity as InfinityIcon,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  getPlansAdmin,
  createPlan,
  updatePlan,
  deletePlan,
  type AdminPlan,
  type PlanInput,
} from "@/lib/api/plans";
import Modal from "@/components/admin/Modal";
import { useStatusModal } from "@/components/ui/useStatusModal";

const inputStyle = { background: "#0d0d14", border: "1px solid #1c1c28" };
const inputClass =
  "w-full px-4 py-3 rounded-lg text-sm text-[#f4f4f6] placeholder-[#3d3d54] outline-none transition-all";

function onFocus(
  e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
) {
  e.currentTarget.style.borderColor = "#7c3aed";
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.15)";
}
function onBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = "#1c1c28";
  e.currentTarget.style.boxShadow = "none";
}

function formatVnd(v: number) {
  return v.toLocaleString("vi-VN") + "đ";
}

function quotaLabel(p: AdminPlan) {
  if (p.isUnlimited) return "Không giới hạn";
  const parts: string[] = [];
  if (p.dailyScoreLimit != null) parts.push(`${p.dailyScoreLimit}/ngày`);
  if (p.monthlyScoreLimit != null) parts.push(`${p.monthlyScoreLimit}/tháng`);
  return parts.length ? parts.join(" · ") : "—";
}

interface FormState {
  slug: string;
  name: string;
  description: string;
  priceVnd: string;
  durationDays: string;
  sortOrder: string;
  isUnlimited: boolean;
  dailyScoreLimit: string;
  monthlyScoreLimit: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  slug: "",
  name: "",
  description: "",
  priceVnd: "",
  durationDays: "",
  sortOrder: "0",
  isUnlimited: false,
  dailyScoreLimit: "",
  monthlyScoreLimit: "",
  isActive: true,
};

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const { confirm, statusModal } = useStatusModal();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminPlan | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setPlans(await getPlansAdmin());
    } catch {
      toast.error("Không tải được danh sách gói.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError("");
    setModalOpen(true);
  }

  function openEdit(p: AdminPlan) {
    setEditing(p);
    setForm({
      slug: p.slug,
      name: p.name,
      description: p.description ?? "",
      priceVnd: String(p.priceVnd),
      durationDays: String(p.durationDays),
      sortOrder: String(p.sortOrder),
      isUnlimited: p.isUnlimited,
      dailyScoreLimit: p.dailyScoreLimit != null ? String(p.dailyScoreLimit) : "",
      monthlyScoreLimit:
        p.monthlyScoreLimit != null ? String(p.monthlyScoreLimit) : "",
      isActive: p.isActive,
    });
    setError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const slug = form.slug.trim();
    const name = form.name.trim();
    if (!slug || !name) {
      setError("Vui lòng điền đầy đủ slug và tên.");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      setError("Slug chỉ gồm chữ thường, số và dấu gạch ngang.");
      return;
    }
    const priceVnd = Number(form.priceVnd);
    const durationDays = Number(form.durationDays);
    if (!Number.isInteger(priceVnd) || priceVnd < 0) {
      setError("Giá phải là số nguyên ≥ 0.");
      return;
    }
    if (!Number.isInteger(durationDays) || durationDays < 1) {
      setError("Kỳ hạn phải là số nguyên ≥ 1 ngày.");
      return;
    }

    const payload: PlanInput = {
      slug,
      name,
      description: form.description.trim() || null,
      priceVnd,
      durationDays,
      sortOrder: Number(form.sortOrder) || 0,
      isUnlimited: form.isUnlimited,
      dailyScoreLimit: form.isUnlimited
        ? null
        : form.dailyScoreLimit.trim()
          ? Number(form.dailyScoreLimit)
          : null,
      monthlyScoreLimit: form.isUnlimited
        ? null
        : form.monthlyScoreLimit.trim()
          ? Number(form.monthlyScoreLimit)
          : null,
      isActive: form.isActive,
    };

    setSaving(true);
    try {
      if (editing) {
        await updatePlan(editing.id, payload);
        toast.success("Đã cập nhật gói.");
      } else {
        await createPlan(payload);
        toast.success("Đã tạo gói.");
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

  async function handleToggle(p: AdminPlan) {
    const turningOff = p.isActive;
    const ok = await confirm({
      type: "alert",
      title: turningOff ? `Tắt gói "${p.name}"?` : `Bật lại gói "${p.name}"?`,
      message: turningOff
        ? "Gói sẽ bị ẩn khỏi trang Bảng giá, người dùng mới không mua được. Subscription đang hoạt động không bị ảnh hưởng."
        : "Gói sẽ hiển thị trở lại trên trang Bảng giá.",
      confirmText: turningOff ? "Tắt gói" : "Bật gói",
    });
    if (!ok) return;
    setTogglingId(p.id);
    try {
      await updatePlan(p.id, { isActive: !p.isActive });
      toast.success(turningOff ? "Đã tắt gói." : "Đã bật gói.");
      await load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      toast.error(msg || "Không thể đổi trạng thái gói.");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(p: AdminPlan) {
    const ok = await confirm({
      type: "error",
      title: `Xóa gói "${p.name}"?`,
      message: "Hành động này không thể hoàn tác.",
      confirmText: "Xóa",
    });
    if (!ok) return;
    try {
      await deletePlan(p.id);
      toast.success("Đã xóa gói.");
      await load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      toast.error(msg || "Không thể xóa gói.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#f4f4f6]">Gói</h2>
          <p className="text-sm text-[#606072] mt-1">
            Quản lý các gói đăng ký hiển thị trên trang Bảng giá.
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
          Thêm gói
        </button>
      </div>

      <div className="rounded-2xl border border-[#1c1c28] bg-[#0d0d14] overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1.4fr_0.9fr_0.7fr_1fr_auto_auto] gap-4 px-5 py-3 border-b border-[#1c1c28] text-xs font-medium uppercase tracking-wider text-[#606072]">
          <span>Tên / Slug</span>
          <span className="text-right">Giá</span>
          <span className="text-right">Kỳ hạn</span>
          <span>Lượt chấm</span>
          <span className="w-24 text-center">Trạng thái</span>
          <span className="w-28 text-right">Thao tác</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-[#606072]">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : plans.length === 0 ? (
          <p className="text-center py-16 text-sm text-[#606072]">
            Chưa có gói nào. Bấm “Thêm gói” để tạo gói đầu tiên.
          </p>
        ) : (
          plans.map((p) => {
            const used = p._count.subscriptions + p._count.orders;
            return (
              <div
                key={p.id}
                className="grid grid-cols-[1.4fr_0.9fr_0.7fr_1fr_auto_auto] gap-4 px-5 py-3.5 border-b border-[#1c1c28] last:border-0 items-center hover:bg-[#13131c] transition-colors duration-150"
                style={{ opacity: p.isActive ? 1 : 0.55 }}
              >
                {/* Name / slug */}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#f4f4f6] truncate">
                    {p.name}
                  </p>
                  <p className="text-xs font-mono text-[#606072] truncate">
                    {p.slug}
                  </p>
                </div>

                <span className="text-sm text-[#f4f4f6] text-right tabular-nums">
                  {formatVnd(p.priceVnd)}
                </span>
                <span className="text-sm text-[#9898aa] text-right tabular-nums">
                  {p.durationDays} ngày
                </span>

                <span className="text-sm text-[#9898aa] inline-flex items-center gap-1.5 min-w-0">
                  {p.isUnlimited && (
                    <InfinityIcon size={14} className="text-[#8b5cf6] flex-shrink-0" />
                  )}
                  <span className="truncate">{quotaLabel(p)}</span>
                </span>

                {/* Status badge */}
                <div className="w-24 flex justify-center">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                    style={
                      p.isActive
                        ? { background: "rgba(34,197,94,0.12)", color: "#22c55e" }
                        : { background: "#1c1c28", color: "#606072" }
                    }
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: p.isActive ? "#22c55e" : "#606072",
                      }}
                    />
                    {p.isActive ? "Đang bật" : "Đã tắt"}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1 w-28">
                  <button
                    onClick={() => handleToggle(p)}
                    disabled={togglingId === p.id}
                    className="p-2 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                    style={{ color: p.isActive ? "#22c55e" : "#606072" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#1c1c28")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                    aria-label={p.isActive ? "Tắt gói" : "Bật gói"}
                    title={p.isActive ? "Tắt gói" : "Bật gói"}
                  >
                    {togglingId === p.id ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Power size={15} />
                    )}
                  </button>
                  <button
                    onClick={() => openEdit(p)}
                    className="p-2 rounded-md text-[#606072] hover:text-[#8b5cf6] hover:bg-[#1c1c28] transition-colors cursor-pointer"
                    aria-label="Sửa"
                    title="Sửa"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(p)}
                    disabled={used > 0}
                    className="p-2 rounded-md text-[#606072] hover:text-[#ef4444] hover:bg-[#1c1c28] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-[#606072] disabled:hover:bg-transparent"
                    aria-label="Xóa"
                    title={
                      used > 0
                        ? "Không thể xóa: gói đã được dùng trong subscription/đơn hàng"
                        : "Xóa"
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Sửa gói" : "Thêm gói"}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#9898aa]">Tên</label>
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Gói 1 tháng"
                className={inputClass}
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#9898aa]">Slug</label>
              <input
                value={form.slug}
                onChange={(e) => set("slug", e.target.value)}
                placeholder="pro-1m"
                className={`${inputClass} font-mono`}
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#9898aa]">
              Mô tả{" "}
              <span className="text-[#3d3d54] normal-case">(tùy chọn)</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Phù hợp ôn luyện trước kỳ phỏng vấn."
              rows={2}
              className={`${inputClass} resize-none`}
              style={inputStyle}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#9898aa]">
                Giá (VND)
              </label>
              <input
                type="number"
                min={0}
                value={form.priceVnd}
                onChange={(e) => set("priceVnd", e.target.value)}
                placeholder="89000"
                className={inputClass}
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#9898aa]">
                Kỳ hạn (ngày)
              </label>
              <input
                type="number"
                min={1}
                value={form.durationDays}
                onChange={(e) => set("durationDays", e.target.value)}
                placeholder="30"
                className={inputClass}
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#9898aa]">
                Thứ tự
              </label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => set("sortOrder", e.target.value)}
                placeholder="0"
                className={inputClass}
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>
          </div>

          {/* Quota */}
          <div className="rounded-lg border border-[#1c1c28] p-4 flex flex-col gap-4">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.isUnlimited}
                onChange={(e) => set("isUnlimited", e.target.checked)}
                className="w-4 h-4 accent-[#7c3aed] cursor-pointer"
              />
              <span className="text-sm text-[#f4f4f6]">
                Không giới hạn lượt chấm
              </span>
            </label>

            {!form.isUnlimited && (
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[#9898aa]">
                    Giới hạn / ngày{" "}
                    <span className="text-[#3d3d54] normal-case">(trống = ∞)</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.dailyScoreLimit}
                    onChange={(e) => set("dailyScoreLimit", e.target.value)}
                    placeholder="—"
                    className={inputClass}
                    style={inputStyle}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[#9898aa]">
                    Giới hạn / tháng{" "}
                    <span className="text-[#3d3d54] normal-case">(trống = ∞)</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.monthlyScoreLimit}
                    onChange={(e) => set("monthlyScoreLimit", e.target.value)}
                    placeholder="—"
                    className={inputClass}
                    style={inputStyle}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                </div>
              </div>
            )}
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => set("isActive", e.target.checked)}
              className="w-4 h-4 accent-[#7c3aed] cursor-pointer"
            />
            <span className="text-sm text-[#f4f4f6]">
              Hiển thị trên trang Bảng giá (đang bật)
            </span>
          </label>

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

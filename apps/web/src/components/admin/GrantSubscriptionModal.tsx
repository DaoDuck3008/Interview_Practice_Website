"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import Modal from "./Modal";
import { getPlansAdmin, type AdminPlan } from "@/lib/api/plans";
import { grantSubscription } from "@/lib/api/subscriptions";
import type { AdminUser } from "@/lib/api/users";
import { formatDay } from "@/lib/utils/format";
import { SUBSCRIPTION_STATUS_META } from "@/lib/utils/subscriptions";

const fieldClass =
  "bg-[var(--color-surface)] border border-[var(--color-border)]";
const inputClass =
  "w-full px-3 py-2 rounded-lg text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-faint)] outline-none";
const labelClass = "block text-xs text-[var(--color-text-secondary)] mb-1.5";

interface Props {
  /** User được cấp; null = đóng modal. */
  user: AdminUser | null;
  onClose: () => void;
  onGranted: () => void;
}

export default function GrantSubscriptionModal({
  user,
  onClose,
  onGranted,
}: Props) {
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [planId, setPlanId] = useState("");
  const [mode, setMode] = useState<"plan" | "custom">("plan");
  const [days, setDays] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Nạp danh sách gói + reset form mỗi khi mở cho user mới.
  useEffect(() => {
    if (!user) return;
    queueMicrotask(() => {
    setPlanId("");
    setMode("plan");
    setDays("");
    setNote("");
    setError("");
    getPlansAdmin()
      .then((data) => {
        setPlans(data);
        if (data.length) setPlanId(data[0].id);
      })
      .catch(() => toast.error("Không tải được danh sách gói."));
    });
  }, [user]);

  const selectedPlan = plans.find((p) => p.id === planId);

  async function handleSubmit() {
    if (!user) return;
    if (!planId) return setError("Vui lòng chọn gói.");
    let customDays: number | undefined;
    if (mode === "custom") {
      customDays = Number(days);
      if (!Number.isInteger(customDays) || customDays < 1) {
        return setError("Số ngày tùy chỉnh phải là số nguyên ≥ 1.");
      }
    }
    if (!note.trim()) return setError("Vui lòng nhập lý do cấp gói.");

    setSaving(true);
    setError("");
    try {
      await grantSubscription({
        userId: user.id,
        planId,
        days: customDays,
        note: note.trim(),
      });
      toast.success("Đã cấp gói cho người dùng.");
      onGranted();
      onClose();
    } catch {
      toast.error("Không thể cấp gói. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  const sub = user?.subscription;

  return (
    <Modal open={user !== null} onClose={onClose} title="Cấp gói thủ công">
      {user && (
        <div className="flex flex-col gap-4">
          {/* User cố định */}
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
            <p className="text-sm text-[var(--color-text-primary)]">
              {user.name}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              {user.email}
            </p>
            {sub ? (
              <p className="text-xs text-[var(--color-text-secondary)] mt-1.5">
                Gói hiện tại:{" "}
                <span
                  style={{ color: SUBSCRIPTION_STATUS_META[sub.status].color }}
                >
                  {SUBSCRIPTION_STATUS_META[sub.status].label}
                </span>{" "}
                · {sub.planName} · hết hạn {formatDay(sub.expiresAt)}
              </p>
            ) : (
              <p className="text-xs text-[var(--color-text-muted)] mt-1.5">
                Chưa có gói nào.
              </p>
            )}
          </div>

          {/* Gói */}
          <div>
            <label className={labelClass}>Gói</label>
            <select
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              className={`${inputClass} ${fieldClass} cursor-pointer`}
            >
              {plans.map((p) => (
                <option
                  key={p.id}
                  value={p.id}
                  className="bg-[var(--color-surface)]"
                >
                  {p.name} ({p.durationDays} ngày)
                  {p.isActive ? "" : " — đã tắt"}
                </option>
              ))}
            </select>
          </div>

          {/* Thời hạn */}
          <div>
            <label className={labelClass}>Thời hạn</label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm text-[var(--color-text-primary)] cursor-pointer">
                <input
                  type="radio"
                  checked={mode === "plan"}
                  onChange={() => setMode("plan")}
                  className="accent-[var(--color-accent)]"
                />
                Theo kỳ hạn gói
                {selectedPlan ? ` (${selectedPlan.durationDays} ngày)` : ""}
              </label>
              <label className="flex items-center gap-2 text-sm text-[var(--color-text-primary)] cursor-pointer">
                <input
                  type="radio"
                  checked={mode === "custom"}
                  onChange={() => setMode("custom")}
                  className="accent-[var(--color-accent)]"
                />
                Tùy chỉnh
                <input
                  type="number"
                  min={1}
                  value={days}
                  onChange={(e) => {
                    setDays(e.target.value);
                    setMode("custom");
                  }}
                  placeholder="số ngày"
                  className={`w-28 px-2 py-1 rounded-md text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-faint)] outline-none ${fieldClass}`}
                />
              </label>
            </div>
          </div>

          {/* Lý do */}
          <div>
            <label className={labelClass}>
              Lý do <span className="text-[var(--color-danger)]">*</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="VD: Đền bù sự cố thanh toán / tặng dùng thử…"
              className={`${inputClass} ${fieldClass}`}
            />
          </div>

          {error && (
            <p className="text-sm text-[var(--color-danger)]">{error}</p>
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-elevated)] transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-[var(--color-accent)] transition-opacity hover:opacity-90 cursor-pointer disabled:opacity-50"
            >
              {saving && <Loader2 size={15} className="animate-spin" />}
              Cấp gói
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

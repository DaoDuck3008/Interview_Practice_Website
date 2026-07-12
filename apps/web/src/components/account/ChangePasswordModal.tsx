"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, X } from "lucide-react";
import { toast } from "react-toastify";
import ModalPortal from "@/components/ui/ModalPortal";
import { changePasswordApi } from "@/lib/api/auth";
import { useAuthStore } from "@/stores/auth.store";

interface Props {
  open: boolean;
  onClose: () => void;
}

const fieldClass =
  "w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 pr-11 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none transition-all focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/30";
const labelClass = "text-xs font-medium text-[var(--color-text-secondary)]";

export default function ChangePasswordModal({ open, onClose }: Props) {
  const router = useRouter();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset form mỗi lần mở.
  useEffect(() => {
    if (open) {
      queueMicrotask(() => {
        setOldPassword("");
        setNewPassword("");
        setConfirm("");
        setShow(false);
        setError("");
        setSaving(false);
      });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!oldPassword || !newPassword || !confirm) {
      setError("Vui lòng điền đầy đủ thông tin.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    }
    if (newPassword !== confirm) {
      setError("Xác nhận mật khẩu không khớp.");
      return;
    }
    if (newPassword === oldPassword) {
      setError("Mật khẩu mới phải khác mật khẩu hiện tại.");
      return;
    }

    setSaving(true);
    try {
      await changePasswordApi(oldPassword, newPassword);
      toast.success("Đổi mật khẩu thành công. Vui lòng đăng nhập lại.");
      clearAuth();
      onClose();
      const redirect =
        window.location.pathname +
        window.location.search +
        window.location.hash;
      router.replace(
        `/login?notice=password_changed&redirect=${encodeURIComponent(redirect)}`,
      );
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(msg || "Đổi mật khẩu thất bại. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60"
        onMouseDown={onClose}
      >
        <div
          className="w-full max-w-md rounded-2xl border border-white/10 bg-[var(--color-elevated)] overflow-hidden"
          style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <h2 className="text-white font-semibold text-[var(--color-text-primary)]">
              Đổi mật khẩu
            </h2>
            <button
              onClick={onClose}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
              aria-label="Đóng"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
            <Field
              label="Mật khẩu hiện tại"
              value={oldPassword}
              onChange={setOldPassword}
              show={show}
              autoComplete="current-password"
            />
            <Field
              label="Mật khẩu mới"
              value={newPassword}
              onChange={setNewPassword}
              show={show}
              autoComplete="new-password"
              placeholder="Ít nhất 8 ký tự"
            />
            <Field
              label="Xác nhận mật khẩu mới"
              value={confirm}
              onChange={setConfirm}
              show={show}
              autoComplete="new-password"
            />

            <label className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={show}
                onChange={(e) => setShow(e.target.checked)}
                className="accent-[var(--color-accent)]"
              />
              Hiện mật khẩu
            </label>

            {error && (
              <p className="text-sm text-[var(--color-danger)]">{error}</p>
            )}

            <div className="mt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-white/10 px-4 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center gap-2 rounded-md bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[var(--color-accent-light)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving && <Loader2 size={15} className="animate-spin" />}
                Cập nhật
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}

function Field({
  label,
  value,
  onChange,
  show,
  autoComplete,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  autoComplete: string;
  placeholder?: string;
}) {
  const [reveal, setReveal] = useState(false);
  const visible = show || reveal;
  return (
    <div className="flex flex-col gap-1.5">
      <label className={labelClass}>{label}</label>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={fieldClass}
        />
        <button
          type="button"
          onClick={() => setReveal((r) => !r)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
          aria-label={visible ? "Ẩn" : "Hiện"}
          tabIndex={-1}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

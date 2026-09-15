"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  CheckCircle2,
  Info,
  AlertTriangle,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import ModalPortal from "./ModalPortal";

export type StatusType = "success" | "info" | "alert" | "error";

interface StatusModalProps {
  open: boolean;
  type?: StatusType;
  title: string;
  message?: string;
  /** Nếu truyền → hiện nút xác nhận + hủy (dạng confirm). Bỏ qua → chỉ 1 nút đóng. */
  onConfirm?: () => void;
  onClose: () => void;
  confirmText?: string;
  cancelText?: string;
}

const CONFIG: Record<StatusType, { icon: LucideIcon; color: string }> = {
  success: { icon: CheckCircle2, color: "#22c55e" },
  info: { icon: Info, color: "#8b5cf6" },
  alert: { icon: AlertTriangle, color: "#f59e0b" },
  error: { icon: XCircle, color: "#ef4444" },
};

export default function StatusModal({
  open,
  type = "info",
  title,
  message,
  onConfirm,
  onClose,
  confirmText = "Xác nhận",
  cancelText,
}: StatusModalProps) {
  const pathname = usePathname();
  // mounted: còn render trong DOM (giữ lại để chạy animation thoát)
  // show: trạng thái hiển thị (điều khiển transition vào/ra)
  const [mounted, setMounted] = useState(open);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => {
        setMounted(true);
        requestAnimationFrame(() => setShow(true));
      }, 0);
      return () => clearTimeout(t);
    }
    queueMicrotask(() => setShow(false));
    const t = setTimeout(() => setMounted(false), 200);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  const { icon: Icon, color } = CONFIG[type];
  const isConfirm = typeof onConfirm === "function";
  const isAdmin = pathname.startsWith("/admin");
  const closeLabel = cancelText ?? (isConfirm ? "Hủy" : "Đóng");

  return (
    <ModalPortal>
      <div
        className={`fixed inset-0 z-[110] flex items-center justify-center p-4 transition-opacity duration-200 ${
          isAdmin ? "bg-black/60" : "bg-[#060816]/70 backdrop-blur-[2px]"
        }`}
        style={{ opacity: show ? 1 : 0 }}
        onMouseDown={onClose}
      >
        <div
          className={`w-full max-w-sm rounded-2xl p-6 transition-all duration-200 ${
            isAdmin
              ? "border border-[#1c1c28] bg-[#0d0d14]"
              : "border border-[#c4b5fd]/20 bg-[#1b2248]/82 backdrop-blur-2xl"
          }`}
          style={{
            boxShadow: isAdmin
              ? "0 20px 60px rgba(0,0,0,0.5)"
              : "0 24px 72px rgba(2,6,23,0.46), inset 0 1px 0 rgba(255,255,255,0.1)",
            opacity: show ? 1 : 0,
            transform: show
              ? "scale(1) translateY(0)"
              : "scale(0.95) translateY(8px)",
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col items-center text-center">
            <div
              key={`${type}-${open}`}
              className="status-icon-pop w-14 h-14 rounded-full flex items-center justify-center mb-4"
              style={{
                background: `${color}1a`,
                border: `1px solid ${color}4d`,
              }}
            >
              <Icon size={28} style={{ color }} />
            </div>

            <h3 className="text-lg font-semibold text-[#f4f4f6]">{title}</h3>
            {message && (
              <p className="text-sm text-[#9898aa] mt-1.5 leading-relaxed">
                {message}
              </p>
            )}
          </div>

          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={onClose}
              className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                isAdmin
                  ? "border-[#1c1c28] text-[#9898aa] hover:bg-[#13131c] hover:text-[#f4f4f6]"
                  : "border-white/12 bg-white/[0.045] text-[#cbd5e1] hover:border-[#c4b5fd]/35 hover:bg-white/[0.1] hover:text-white"
              }`}
            >
              {closeLabel}
            </button>
            {isConfirm && (
              <button
                onClick={onConfirm}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer"
                style={{ background: color }}
              >
                {confirmText}
              </button>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

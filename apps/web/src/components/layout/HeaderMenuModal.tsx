"use client";

import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import ModalPortal from "@/components/ui/ModalPortal";

// Modal điều hướng riêng cho Header, trượt từ trên xuống để không phụ thuộc modal của khu vực admin.
export default function HeaderMenuModal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(open);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        setMounted(true);
        requestAnimationFrame(() => setShow(true));
      }, 0);
      return () => clearTimeout(timer);
    }

    queueMicrotask(() => setShow(false));
    const timer = setTimeout(() => setMounted(false), 300);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open, onClose]);

  if (!mounted) return null;

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[110] bg-black/60 transition-opacity duration-300"
        style={{ opacity: show ? 1 : 0 }}
        onMouseDown={onClose}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-label="Điều hướng"
          className="fixed left-3 right-3 top-3 z-[120] mx-auto max-w-xl overflow-hidden rounded-[1.5rem] border border-white/[0.12] bg-[#0f172a]/95 shadow-[0_22px_70px_rgba(2,6,23,0.42)] backdrop-blur-2xl transition-transform duration-300 sm:left-5 sm:right-5"
          style={{ transform: show ? "translateY(0)" : "translateY(-1rem)" }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-white/[0.1] px-4 py-3">
            <p className="text-sm font-black text-white">Điều hướng</p>
            <button
              type="button"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-full text-[#a7a3bd] transition-colors hover:bg-white/[0.08] hover:text-white"
              aria-label="Đóng menu"
            >
              <X size={17} />
            </button>
          </div>
          <div className="max-h-[calc(100dvh-6rem)] overflow-y-auto p-4">
            {children}
          </div>
        </section>
      </div>
    </ModalPortal>
  );
}

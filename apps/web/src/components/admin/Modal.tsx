"use client";

import { useEffect, ReactNode } from "react";
import { X } from "lucide-react";
import ModalPortal from "@/components/ui/ModalPortal";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function Modal({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
        onMouseDown={onClose}
      >
        <div
          className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-surface"
          style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="font-semibold text-white">{title}</h2>
            <button
              onClick={onClose}
              className="cursor-pointer text-text-muted transition-colors hover:text-text-primary"
              aria-label="Đóng"
            >
              <X size={18} />
            </button>
          </div>
          <div className="p-6">{children}</div>
        </div>
      </div>
    </ModalPortal>
  );
}

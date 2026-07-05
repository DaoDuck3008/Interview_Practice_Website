"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import ModalPortal from "./ModalPortal";

/** Xem ảnh phóng to trên nền đen mờ phủ toàn màn hình. Nhấn nền hoặc Escape để đóng. */
export default function ImageLightbox({
  src,
  onClose,
}: {
  src: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-120 flex items-center justify-center bg-black/80 p-4"
        onMouseDown={onClose}
      >
        <button
          onClick={onClose}
          aria-label="Đóng"
          className="absolute right-4 top-4 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
        >
          <X size={18} />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Ảnh đính kèm"
          onMouseDown={(e) => e.stopPropagation()}
          className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
        />
      </div>
    </ModalPortal>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, X } from "lucide-react";
import ModalPortal from "../ui/ModalPortal";
import { useFavoritesStore } from "@/stores/favorites.store";
import { LEVEL_STYLE } from "@/lib/utils/levels";
import { getPracticeQuestionHref } from "@/lib/utils/question-url";

interface FavoritesDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function FavoritesDrawer({
  open,
  onClose,
}: FavoritesDrawerProps) {
  const recent = useFavoritesStore((s) => s.recent);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const router = useRouter();

  // mounted: còn render trong DOM (giữ lại để chạy animation thoát)
  // show: điều khiển transform trượt vào/ra
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
    const t = setTimeout(() => setMounted(false), 300);
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

  function goToSaved() {
    onClose();
    router.push("/saved");
  }

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[110] bg-black/60 transition-opacity duration-300"
        style={{ opacity: show ? 1 : 0 }}
        onMouseDown={onClose}
      >
        <div
          className="fixed inset-y-0 right-0 z-[120] w-[85%] max-w-sm flex flex-col transition-transform duration-300"
          style={{
            background: "#0d0d14",
            borderLeft: "1px solid #1c1c28",
            transform: show ? "translateX(0)" : "translateX(100%)",
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1c1c28]">
            <h3 className="text-sm font-bold text-[#f4f4f6]">
              Câu hỏi đã lưu
            </h3>
            <button
              onClick={onClose}
              className="text-[#606072] hover:text-[#f4f4f6] transition-colors cursor-pointer"
              aria-label="Đóng"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 px-6 text-center">
                <Bookmark size={22} className="text-[#606072]" />
                <p className="text-sm text-[#606072]">
                  Chưa có câu hỏi yêu thích nào.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col divide-y divide-[#1c1c28]">
                {recent.map((q) => {
                  const levelStyle = LEVEL_STYLE[q.level];
                  const topicSlug = q.topic?.slug ?? "";
                  return (
                    <li key={q.id} className="flex items-stretch">
                      <Link
                        href={
                          topicSlug ? getPracticeQuestionHref(topicSlug, q) : "#"
                        }
                        onClick={onClose}
                        className="flex-1 min-w-0 flex flex-col gap-1.5 px-5 py-3.5 hover:bg-[#13131c] transition-colors duration-150"
                      >
                        <p className="text-sm text-[#d4d4e0] line-clamp-2">
                          {q.content}
                        </p>
                        <span
                          className={`self-start text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${levelStyle.className}`}
                        >
                          {levelStyle.label}
                        </span>
                      </Link>
                      {/* Nút riêng, không lồng trong Link (a) — tránh interactive-in-interactive */}
                      <button
                        onClick={() => toggleFavorite(q)}
                        className="flex-shrink-0 px-4 flex items-center justify-center text-[#606072] hover:text-[#ef4444] transition-colors duration-150 cursor-pointer"
                        title="Bỏ lưu"
                        aria-label="Bỏ lưu câu hỏi này"
                      >
                        <X size={14} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="px-5 py-4 border-t border-[#1c1c28]">
            <button
              onClick={goToSaved}
              className="w-full text-sm font-semibold text-white bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg py-2.5 transition-colors duration-200 cursor-pointer"
            >
              Xem tất cả
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

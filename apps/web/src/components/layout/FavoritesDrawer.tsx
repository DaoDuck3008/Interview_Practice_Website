"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Bookmark, BookmarkCheck, X } from "lucide-react";
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
        className="fixed inset-0 z-[110] bg-base/75 backdrop-blur-[2px] transition-opacity duration-300"
        style={{ opacity: show ? 1 : 0 }}
        onMouseDown={onClose}
      >
        <div
          className="fixed inset-y-0 right-0 z-[120] flex w-full max-w-md flex-col border-l border-white/[0.13] shadow-[-24px_0_64px_rgba(2,6,23,0.42),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-2xl transition-transform duration-300"
          style={{
            background: "rgba(20, 25, 56, 0.44)",
            transform: show ? "translateX(0)" : "translateX(100%)",
          }}
          onMouseDown={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="favorites-drawer-title"
        >
          <div className="border-b border-white/10 px-5 pb-4 pt-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#c4b5fd]/25 bg-[#5930a8]/25 text-[#c4b5fd] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                <BookmarkCheck size={18} />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="mt-1 flex items-center gap-2">
                  <h2
                    id="favorites-drawer-title"
                    className="text-[16px] font-bold tracking-tight text-text-primary"
                  >
                    Câu hỏi đã lưu
                  </h2>
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 font-mono text-[11px] tabular-nums text-text-secondary">
                    {recent.length}
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-text-muted transition-[background-color,border-color,color,transform] duration-200 hover:border-white/20 hover:bg-white/[0.08] hover:text-text-primary active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
                aria-label="Đóng câu hỏi đã lưu"
                title="Đóng"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {recent.length === 0 ? (
              <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#c4b5fd]/20 bg-[#5930a8]/20 text-[#c4b5fd] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                  <Bookmark size={22} />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-text-primary">
                  Chưa có câu hỏi đã lưu
                </h3>
                <p className="mt-2 max-w-64 text-sm leading-relaxed text-text-secondary">
                  Lưu những câu hỏi cần ôn lại để tạo danh sách luyện tập của
                  riêng bạn.
                </p>
                <Link
                  href="/learning/javascript/questions"
                  onClick={onClose}
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#c4b5fd] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c4b5fd]/70"
                >
                  Khám phá câu hỏi
                  <ArrowUpRight size={15} />
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between px-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                    Đã lưu gần đây
                  </p>
                  <span className="font-mono text-[11px] tabular-nums text-text-muted">
                    {recent.length}/8
                  </span>
                </div>
                <ul className="flex flex-col gap-2">
                  {recent.map((q) => {
                    const levelStyle = LEVEL_STYLE[q.level];
                    const topicSlug = q.topic?.slug ?? "";
                    return (
                      <li
                        key={q.id}
                        className="group relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.025] transition-[background-color,border-color,transform] duration-200 hover:-translate-y-px hover:border-[#c4b5fd]/35 hover:bg-[#252d46]"
                      >
                        <Link
                          href={
                            topicSlug
                              ? getPracticeQuestionHref(topicSlug, q)
                              : "/saved"
                          }
                          onClick={onClose}
                          className="flex min-w-0 flex-col gap-2 px-4 py-3.5 pr-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/70"
                        >
                          <p className="text-sm font-medium leading-relaxed text-text-primary line-clamp-2">
                            {q.content}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-text-muted">
                            <span className="truncate">
                              {q.topic?.name ?? "Chủ đề chưa xác định"}
                            </span>
                            <span className="h-1 w-1 shrink-0 rounded-full bg-text-faint" />
                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${levelStyle.className}`}
                            >
                              {levelStyle.label}
                            </span>
                          </div>
                        </Link>
                        <button
                          onClick={() => toggleFavorite(q)}
                          className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-text-muted transition-[background-color,color,transform] duration-200 hover:bg-danger/10 hover:text-danger active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/70"
                          title="Bỏ lưu"
                          aria-label="Bỏ lưu câu hỏi này"
                        >
                          <X size={14} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>

          <div className="border-t border-white/10 bg-white/[0.02] px-5 py-4">
            <button
              onClick={goToSaved}
              className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#5930a8] text-sm font-semibold text-white shadow-[0_10px_24px_rgba(76,45,145,0.24)] transition-[background-color,transform,box-shadow] duration-200 hover:-translate-y-px hover:bg-[#6a3bc4] hover:shadow-[0_14px_28px_rgba(76,45,145,0.32)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c4b5fd] focus-visible:ring-offset-2 focus-visible:ring-offset-[#141938]"
            >
              Xem tất cả
              <ArrowUpRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

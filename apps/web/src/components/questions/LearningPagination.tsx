"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface LearningPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function buildPages(page: number, totalPages: number): (number | "…")[] {
  if (totalPages <= 7)
    return Array.from({ length: totalPages }, (_, i) => i + 1);

  const pages: (number | "…")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);

  if (start > 2) pages.push("…");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages - 1) pages.push("…");

  pages.push(totalPages);
  return pages;
}

export default function LearningPagination({
  page,
  totalPages,
  onPageChange,
}: LearningPaginationProps) {
  if (totalPages <= 1) return null;

  const pages = buildPages(page, totalPages);

  return (
    <div className="flex items-center justify-center gap-1.5 py-6">
      {/* Prev */}
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-[#1a2033] text-[#cbd5e1] transition-[transform,background-color,border-color,color] duration-200 hover:-translate-y-0.5 hover:border-[#c4b5fd]/35 hover:bg-[#252d46] hover:text-white disabled:pointer-events-none disabled:opacity-25"
        aria-label="Trang trước"
      >
        <ChevronLeft size={15} />
      </button>

      {/* Pages */}
      {pages.map((p, i) =>
        p === "…" ? (
          <span
            key={`gap-${i}`}
            className="flex h-9 w-9 select-none items-center justify-center text-sm text-[#94a3b8]"
          >
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`h-9 w-9 cursor-pointer rounded-full border text-sm font-semibold transition-[transform,background-color,border-color,color] duration-200 ${
              p === page
                ? "border-[#c4b5fd]/35 bg-[#5930a8] text-white shadow-[0_0_22px_rgba(124,58,237,0.16)]"
                : "border-white/10 bg-[#171d2e] text-[#cbd5e1] hover:-translate-y-0.5 hover:bg-[#252d46] hover:text-white"
            }`}
          >
            {p}
          </button>
        ),
      )}

      {/* Next */}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-[#1a2033] text-[#cbd5e1] transition-[transform,background-color,border-color,color] duration-200 hover:-translate-y-0.5 hover:border-[#c4b5fd]/35 hover:bg-[#252d46] hover:text-white disabled:pointer-events-none disabled:opacity-25"
        aria-label="Trang sau"
      >
        <ChevronRight size={15} />
      </button>
    </div>
  );
}

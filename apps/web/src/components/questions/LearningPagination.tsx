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
    <div className="flex items-center justify-center gap-1 py-6">
      {/* Prev */}
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-[#9898aa] hover:text-[#f4f4f6] hover:bg-[#1c1c28] disabled:opacity-25 disabled:pointer-events-none transition-all duration-150 cursor-pointer"
        aria-label="Trang trước"
      >
        <ChevronLeft size={15} />
      </button>

      {/* Pages */}
      {pages.map((p, i) =>
        p === "…" ? (
          <span
            key={`gap-${i}`}
            className="w-8 h-8 flex items-center justify-center text-sm text-[#606072] select-none"
          >
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className="w-8 h-8 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer"
            style={
              p === page
                ? {
                    background: "rgba(124,58,237,0.2)",
                    color: "#a78bfa",
                    border: "1px solid rgba(124,58,237,0.35)",
                    boxShadow: "0 0 10px rgba(124,58,237,0.15)",
                  }
                : {
                    background: "transparent",
                    color: "#9898aa",
                    border: "1px solid transparent",
                  }
            }
            onMouseEnter={(e) => {
              if (p !== page) {
                e.currentTarget.style.background = "rgba(28,28,40,0.8)";
                e.currentTarget.style.color = "#f4f4f6";
              }
            }}
            onMouseLeave={(e) => {
              if (p !== page) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#9898aa";
              }
            }}
          >
            {p}
          </button>
        ),
      )}

      {/* Next */}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-[#9898aa] hover:text-[#f4f4f6] hover:bg-[#1c1c28] disabled:opacity-25 disabled:pointer-events-none transition-all duration-150 cursor-pointer"
        aria-label="Trang sau"
      >
        <ChevronRight size={15} />
      </button>
    </div>
  );
}

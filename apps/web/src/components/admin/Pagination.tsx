"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  limitOptions?: number[];
}

const selectStyle = { background: "#0d0d14", border: "1px solid #1c1c28" };

/** Tạo dải số trang có rút gọn: 1 … 4 5 [6] 7 8 … 20 */
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

export default function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
  limitOptions = [10, 20, 30, 50, 100],
}: PaginationProps) {
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const pages = buildPages(page, totalPages);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-3.5 border-t border-[#1c1c28]">
      <div className="flex items-center gap-3 text-sm text-[#606072]">
        <span>
          <span className="text-[#9898aa] font-medium">{from}</span>
          {"–"}
          <span className="text-[#9898aa] font-medium">{to}</span>
          {" / "}
          <span className="text-[#9898aa] font-medium">{total}</span>
        </span>
        <div className="flex items-center gap-1.5">
          <span className="hidden sm:inline">Hiển thị</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="px-2 py-1.5 rounded-lg text-sm text-[#f4f4f6] outline-none cursor-pointer"
            style={selectStyle}
          >
            {limitOptions.map((opt) => (
              <option key={opt} value={opt} className="bg-[#0d0d14]">
                {opt}
              </option>
            ))}
          </select>
          <span>/ trang</span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-2 rounded-md text-[#9898aa] hover:text-[#f4f4f6] hover:bg-[#1c1c28] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          aria-label="Trang trước"
        >
          <ChevronLeft size={16} />
        </button>

        {pages.map((p, i) =>
          p === "…" ? (
            <span
              key={`gap-${i}`}
              className="px-2 text-sm text-[#606072] select-none"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className="min-w-[34px] h-[34px] px-2 rounded-md text-sm font-medium transition-colors cursor-pointer"
              style={{
                background: p === page ? "#7c3aed" : "transparent",
                color: p === page ? "#ffffff" : "#9898aa",
                boxShadow:
                  p === page ? "0 0 12px rgba(124,58,237,0.3)" : "none",
              }}
              onMouseEnter={(e) => {
                if (p !== page) e.currentTarget.style.background = "#1c1c28";
              }}
              onMouseLeave={(e) => {
                if (p !== page)
                  e.currentTarget.style.background = "transparent";
              }}
            >
              {p}
            </button>
          ),
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-2 rounded-md text-[#9898aa] hover:text-[#f4f4f6] hover:bg-[#1c1c28] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          aria-label="Trang sau"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

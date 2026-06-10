"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import type { TopicWithCount } from "@/lib/api/topics";

interface TopicsSidebarProps {
  topics: TopicWithCount[];
  currentSlug: string;
  currentLevel?: string;
}

export default function TopicsSidebar({
  topics,
  currentSlug,
  currentLevel,
}: TopicsSidebarProps) {
  const [filter, setFilter] = useState("");

  const total = topics.reduce((s, t) => s + t.questionCount, 0);
  const filtered = filter.trim()
    ? topics.filter((t) =>
        t.name.toLowerCase().includes(filter.trim().toLowerCase()),
      )
    : topics;

  function buildHref(slug: string) {
    const params = new URLSearchParams();
    if (currentLevel) params.set("level", currentLevel);
    const qs = params.toString();
    return `/learning/${slug}/questions${qs ? `?${qs}` : ""}`;
  }

  return (
    <aside
      className="w-60 flex-shrink-0 flex flex-col rounded-2xl border border-[#1c1c28] overflow-hidden sticky top-4 self-start"
      style={{ background: "#0b0b13", maxHeight: "calc(100vh - 88px)" }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-[#1c1c28]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-[#f4f4f6]">Tất Cả</span>
          <span className="text-xs font-mono text-[#606072] bg-[#13131c] px-2 py-0.5 rounded-md">
            {total}
          </span>
        </div>

        {/* Filter input */}
        <div className="relative">
          <Search
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#606072] pointer-events-none"
          />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Lọc danh mục..."
            className="w-full h-7 pl-7 pr-3 text-xs rounded-lg outline-none text-[#f4f4f6] placeholder-[#606072]"
            style={{
              background: "#13131c",
              border: "1px solid #1c1c28",
            }}
          />
        </div>
      </div>

      {/* Topic list */}
      <nav className="flex-1 overflow-y-auto py-1.5">
        {filtered.map((topic) => {
          const active = topic.slug === currentSlug;
          return (
            <Link
              key={topic.id}
              href={buildHref(topic.slug)}
              className={[
                "flex items-center justify-between gap-2 px-4 py-2 text-[13px] transition-colors duration-100",
                active
                  ? "bg-[#7c3aed]/15 text-[#f4f4f6]"
                  : "text-[#9898aa] hover:bg-[#0d0d14] hover:text-[#e4e4f0]",
              ].join(" ")}
            >
              <span className="truncate">{topic.name}</span>
              <span
                className={[
                  "flex-shrink-0 text-[11px] font-mono min-w-[28px] text-center px-1.5 py-0.5 rounded-md",
                  active
                    ? "bg-[#7c3aed] text-white"
                    : "bg-[#13131c] text-[#606072]",
                ].join(" ")}
              >
                {topic.questionCount}
              </span>
            </Link>
          );
        })}

        {filtered.length === 0 && (
          <p className="px-4 py-3 text-xs text-[#606072]">
            Không tìm thấy chủ đề.
          </p>
        )}
      </nav>
    </aside>
  );
}

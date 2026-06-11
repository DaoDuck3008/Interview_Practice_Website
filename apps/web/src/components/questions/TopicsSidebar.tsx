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

  const filterLower = filter.trim().toLowerCase();

  // Separate parents and build children map
  const parents = topics.filter((t) => t.parentId === null);
  const childrenByParent = topics.reduce<Record<string, TopicWithCount[]>>(
    (acc, t) => {
      if (t.parentId) {
        (acc[t.parentId] ??= []).push(t);
      }
      return acc;
    },
    {},
  );

  // Total count across all child topics
  const total = topics
    .filter((t) => t.parentId !== null)
    .reduce((s, t) => s + t.questionCount, 0);

  function buildHref(slug: string) {
    const params = new URLSearchParams();
    if (currentLevel) params.set("level", currentLevel);
    const qs = params.toString();
    return `/learning/${slug}/questions${qs ? `?${qs}` : ""}`;
  }

  // When filtering: only show parents that have matching children
  const visibleParents = filterLower
    ? parents.filter((p) =>
        childrenByParent[p.id]?.some((c) =>
          c.name.toLowerCase().includes(filterLower),
        ),
      )
    : parents;

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
            style={{ background: "#13131c", border: "1px solid #1c1c28" }}
          />
        </div>
      </div>

      {/* Topic list */}
      <nav className="flex-1 overflow-y-auto py-1.5">
        {visibleParents.map((parent) => {
          const children = (childrenByParent[parent.id] ?? []).filter(
            (c) => !filterLower || c.name.toLowerCase().includes(filterLower),
          );

          return (
            <div key={parent.id}>
              {/* Parent group header — not clickable */}
              <div className="flex items-center gap-2 px-4 py-1.5 mt-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#484860]">
                  {parent.name}
                </span>
                <span
                  className="flex-1 h-px"
                  style={{ background: "#1c1c28" }}
                />
              </div>

              {/* Child topics */}
              {children.map((topic) => {
                const active = topic.slug === currentSlug;
                return (
                  <Link
                    key={topic.id}
                    href={buildHref(topic.slug)}
                    className={[
                      "flex items-center justify-between gap-2 pl-4 pr-4 py-[7px] text-[13px] transition-colors duration-100",
                      active
                        ? "bg-[#7c3aed]/15 text-[#f4f4f6]"
                        : "text-[#9898aa] hover:bg-[#0d0d14] hover:text-[#e4e4f0]",
                    ].join(" ")}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {topic.iconUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={topic.iconUrl}
                          alt=""
                          width={16}
                          height={16}
                          className="w-4 h-4 object-contain flex-shrink-0"
                        />
                      ) : (
                        <span className="w-4 h-4 flex-shrink-0 rounded-sm bg-[#1c1c28]" />
                      )}
                      <span className="truncate">{topic.name}</span>
                    </span>
                    <span
                      className={[
                        "flex-shrink-0 text-[11px] font-mono min-w-[24px] text-center px-1.5 py-0.5 rounded-md",
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
            </div>
          );
        })}

        {visibleParents.length === 0 && (
          <p className="px-4 py-3 text-xs text-[#606072]">
            Không tìm thấy chủ đề.
          </p>
        )}
      </nav>
    </aside>
  );
}

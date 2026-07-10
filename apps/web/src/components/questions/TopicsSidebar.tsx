"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
      className="hidden md:flex w-60 flex-shrink-0 flex-col rounded-2xl overflow-hidden sticky top-4 self-start"
      style={{
        background: "rgba(16, 15, 26, 0.82)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.35)",
        maxHeight: "calc(100vh - 88px)",
      }}
    >
      {/* Header */}
      <div
        className="px-4 pt-4 pb-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-[#f4f4f6]">Tất Cả</span>
          <span
            className="text-xs font-mono text-[#606072] px-2 py-0.5 rounded-md"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
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
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
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
                  style={{ background: "rgba(255,255,255,0.06)" }}
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
                        ? "text-[#f4f4f6]"
                        : "text-[#9898aa] hover:text-[#e4e4f0]",
                    ].join(" ")}
                    style={
                      active
                        ? { background: "rgba(124,58,237,0.18)" }
                        : undefined
                    }
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {topic.iconUrl ? (
                        <Image
                          src={topic.iconUrl}
                          alt=""
                          width={20}
                          height={20}
                          className="w-5 h-5 object-contain rounded-md flex-shrink-0"
                        />
                      ) : (
                        <span
                          className="w-5 h-5 flex-shrink-0 rounded-md"
                          style={{ background: "rgba(255,255,255,0.07)" }}
                        />
                      )}
                      <span className="truncate">{topic.name}</span>
                    </span>
                    <span
                      className="flex-shrink-0 text-[11px] font-mono min-w-[24px] text-center px-1.5 py-0.5 rounded-md"
                      style={
                        active
                          ? { background: "#7c3aed", color: "white" }
                          : {
                              background: "rgba(255,255,255,0.06)",
                              color: "#606072",
                            }
                      }
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

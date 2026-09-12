"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search } from "lucide-react";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import type { TopicWithCount } from "@/lib/api/topics";

interface TopicsSidebarProps {
  topics: TopicWithCount[];
  currentSlug: string;
  getTopicHref: (slug: string) => string;
  onTopicChange: (slug: string) => void;
}

export default function TopicsSidebar({
  topics,
  currentSlug,
  getTopicHref,
  onTopicChange,
}: TopicsSidebarProps) {
  const [filter, setFilter] = useState("");
  const [hoveredTopicSlug, setHoveredTopicSlug] = useState<string | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const highlightedTopicSlug = hoveredTopicSlug ?? currentSlug;

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
      className="sticky hidden h-full max-h-[calc(150dvh)] w-60 flex-shrink-0 flex-col overflow-hidden rounded-[28px] md:flex content-ready-enter"
      style={{
        background: "rgba(20, 25, 56, 0.88)",
        border: "1px solid rgba(196,181,253,0.18)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.12), 0 22px 60px rgba(2,6,23,0.32)",
      }}
    >
      {/* Header */}
      <div
        className="px-4 pt-4 pb-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-[#f4f4f6]">Tất Cả</span>
          <span className="rounded-full border border-white/10 bg-white/[0.075] px-2.5 py-0.5 font-mono text-xs text-[#ddd6fe]">
            {total}
          </span>
        </div>

        <div className="relative">
          <Search
            size={12}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#a78bfa]"
          />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Lọc danh mục..."
            className="h-8 w-full rounded-full pl-8 pr-3 text-xs text-[#f4f4f6] outline-none placeholder-[#94a3b8]"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          />
        </div>
      </div>

      {/* Topic list */}
      <LayoutGroup id="question-topic-navigation">
        <nav
          className="flex-1 overflow-y-auto px-2 py-2"
          onPointerLeave={() => setHoveredTopicSlug(null)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setHoveredTopicSlug(null);
            }
          }}
        >
          {visibleParents.map((parent) => {
            const children = (childrenByParent[parent.id] ?? []).filter(
              (c) => !filterLower || c.name.toLowerCase().includes(filterLower),
            );

            return (
              <div key={parent.id}>
                {/* Parent group header — not clickable */}
                <div className="mt-2 flex items-center gap-2 px-3 py-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#c4b5fd]">
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
                  const highlighted = topic.slug === highlightedTopicSlug;
                  return (
                    <div key={topic.id} className="relative">
                      {highlighted && (
                        <motion.span
                          layoutId="question-topic-indicator"
                          className={`pointer-events-none absolute inset-0 rounded-full ring-1 ${
                            active
                              ? "bg-violet-500/24 shadow-[0_0_22px_rgba(124,58,237,0.16)] ring-violet-300/25"
                              : "bg-white/[0.075] ring-white/[0.08]"
                          }`}
                          transition={
                            shouldReduceMotion
                              ? { duration: 0 }
                              : {
                                  type: "spring",
                                  stiffness: 420,
                                  damping: 34,
                                  mass: 0.55,
                                }
                          }
                        />
                      )}
                      <Link
                        href={getTopicHref(topic.slug)}
                        onPointerEnter={() => setHoveredTopicSlug(topic.slug)}
                        onFocus={() => setHoveredTopicSlug(topic.slug)}
                        onClick={(event) => {
                          if (
                            event.metaKey ||
                            event.ctrlKey ||
                            event.shiftKey ||
                            event.altKey
                          )
                            return;
                          event.preventDefault();
                          onTopicChange(topic.slug);
                        }}
                        className={`relative z-10 flex items-center justify-between gap-2 rounded-full px-3.5 py-2 text-[13px] transition-colors duration-200 ${
                          active || highlighted
                            ? "text-[#f4f4f6]"
                            : "text-[#cbd5e1]"
                        }`}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          {topic.iconUrl ? (
                            <Image
                              src={topic.iconUrl}
                              alt=""
                              width={20}
                              height={20}
                              className="h-5 w-5 flex-shrink-0 rounded-full object-contain"
                            />
                          ) : (
                            <span
                              className="h-5 w-5 flex-shrink-0 rounded-full"
                              style={{ background: "rgba(255,255,255,0.07)" }}
                            />
                          )}
                          <span className="truncate">{topic.name}</span>
                        </span>
                        <span
                          className="min-w-[24px] flex-shrink-0 rounded-full px-1.5 py-0.5 text-center font-mono text-[11px]"
                          style={
                            active
                              ? { background: "#7c3aed", color: "white" }
                              : {
                                  background: "rgba(255,255,255,0.075)",
                                  color: "#c4b5fd",
                                }
                          }
                        >
                          {topic.questionCount}
                        </span>
                      </Link>
                    </div>
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
      </LayoutGroup>
    </aside>
  );
}

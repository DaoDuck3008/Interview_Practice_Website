"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import type { TopicWithCount } from "@/lib/api/topics";
import { TopicIcon } from "@/components/ui/TopicOption";

const MAX_TOPICS = 6;

/** Bộ chọn nhiều chủ đề dùng riêng cho form tạo mock interview. */
export default function TopicMultiDropdown({
  topics,
  selectedTopicIds,
  onChange,
  loading,
}: {
  topics: TopicWithCount[];
  selectedTopicIds: string[];
  onChange: (topicIds: string[]) => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedTopics = useMemo(
    () =>
      selectedTopicIds
        .map((topicId) => topics.find((topic) => topic.id === topicId))
        .filter((topic): topic is TopicWithCount => Boolean(topic)),
    [selectedTopicIds, topics],
  );

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const normalizedQuery = query.trim().toLowerCase();
  const visibleTopics = topics.filter(
    (topic) => !normalizedQuery || topic.name.toLowerCase().includes(normalizedQuery),
  );
  const groups = visibleTopics.reduce<Record<string, TopicWithCount[]>>(
    (result, topic) => {
      const key = topic.parentName ?? "Chủ đề khác";
      (result[key] ??= []).push(topic);
      return result;
    },
    {},
  );

  function toggleTopic(topicId: string) {
    if (selectedTopicIds.includes(topicId)) {
      onChange(selectedTopicIds.filter((id) => id !== topicId));
      return;
    }
    if (selectedTopicIds.length >= MAX_TOPICS) return;
    onChange([...selectedTopicIds, topicId]);
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-text-primary">Chủ đề luyện tập</p>
        <span className="text-xs font-semibold text-[#a7a3bd]">
          {selectedTopicIds.length}/{MAX_TOPICS}
        </span>
      </div>
      <button
        type="button"
        onClick={() => !loading && setOpen((current) => !current)}
        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-white/12 bg-white/[0.07] px-3 py-2.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition-all duration-300 hover:bg-white/[0.1]"
      >
        <span className="min-w-0 text-sm font-bold text-white">
          {loading
            ? "Đang tải chủ đề..."
            : selectedTopicIds.length
              ? `Đã chọn ${selectedTopicIds.length} chủ đề`
              : "Chọn từ 2 đến 6 chủ đề"}
        </span>
        <ChevronDown
          size={17}
          className={`shrink-0 text-[#c4b5fd] transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {selectedTopics.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selectedTopics.map((topic) => (
            <span
              key={topic.id}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#c4b5fd]/30 bg-[#7c3aed]/15 py-1 pl-1.5 pr-1 text-[11px] font-bold text-[#ede9fe]"
            >
              <TopicIcon iconUrl={topic.iconUrl} size={16} />
              <span className="truncate">{topic.name}</span>
              <button
                type="button"
                onClick={() => toggleTopic(topic.id)}
                aria-label={`Bỏ chọn ${topic.name}`}
                className="grid size-4 shrink-0 place-items-center rounded-full text-[#c4b5fd] transition-colors hover:bg-white/15 hover:text-white"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-3xl border border-white/14 bg-[#0f172a]/95 shadow-[0_26px_72px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
          <div className="border-b border-white/10 p-3">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#77718f]" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm chủ đề..."
                className="h-10 w-full rounded-full border border-white/10 bg-white/[0.06] pl-9 pr-3 text-sm text-white outline-none placeholder:text-[#77718f] focus:border-[#c4b5fd]/50"
              />
            </div>
          </div>
          <div className="max-h-[320px] space-y-2.5 overflow-y-auto p-3">
            {Object.entries(groups).map(([parentName, group]) => (
              <div key={parentName}>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#8f86ad]">
                  {parentName}
                </p>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {group.map((topic) => {
                    const active = selectedTopicIds.includes(topic.id);
                    const disabled = !active && selectedTopicIds.length >= MAX_TOPICS;
                    return (
                      <label
                        key={topic.id}
                        className={`flex cursor-pointer items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-all duration-200 ${active ? "border-[#c4b5fd]/50 bg-[#7c3aed]/18 text-white" : "border-white/10 bg-white/[0.035] text-[#d8d6ea] hover:border-white/20 hover:bg-white/[0.07]"} ${disabled ? "cursor-not-allowed opacity-45" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          disabled={disabled}
                          onChange={() => toggleTopic(topic.id)}
                          className="size-3.5 shrink-0 accent-[#8b5cf6]"
                        />
                        <TopicIcon iconUrl={topic.iconUrl} size={22} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-bold">{topic.name}</span>
                          <span className="text-[11px] text-[#a7a3bd]">{topic.questionCount} câu</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
            {visibleTopics.length === 0 && (
              <p className="py-6 text-center text-sm text-[#a7a3bd]">Không tìm thấy chủ đề phù hợp.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

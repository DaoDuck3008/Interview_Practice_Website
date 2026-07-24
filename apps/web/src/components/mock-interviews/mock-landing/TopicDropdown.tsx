"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import type { TopicWithCount } from "@/lib/api/topics";
import TopicOption, { TopicIcon } from "@/components/ui/TopicOption";

export default function TopicDropdown({
  topics,
  selectedTopic,
  value,
  onChange,
  loading,
}: {
  topics: TopicWithCount[];
  selectedTopic: TopicWithCount | undefined;
  value: string;
  onChange: (value: string) => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const parents = topics.filter((topic) => topic.parentId === null);
  const childrenByParent = topics.reduce<Record<string, TopicWithCount[]>>(
    (acc, topic) => {
      if (topic.parentId) (acc[topic.parentId] ??= []).push(topic);
      return acc;
    },
    {},
  );
  const queryLower = query.trim().toLowerCase();
  const match = (topic: TopicWithCount) =>
    !queryLower || topic.name.toLowerCase().includes(queryLower);
  const grouped = parents
    .map((parent) => ({
      parent,
      children: (childrenByParent[parent.id] ?? []).filter(match),
    }))
    .filter((group) => group.children.length > 0);
  const standalone = topics.filter(
    (topic) => topic.parentId === null && !childrenByParent[topic.id]?.length,
  );
  const hasGroupedTopics = grouped.length > 0;
  const visibleStandalone = standalone.filter(match);
  const visibleCount = hasGroupedTopics
    ? grouped.reduce((sum, group) => sum + group.children.length, 0) +
      visibleStandalone.length
    : topics.filter(match).length;

  function selectTopic(topicId: string) {
    onChange(topicId);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={rootRef} className="relative">
      <p className="mb-2 text-sm font-semibold text-text-primary">Chủ đề</p>
      <button
        type="button"
        onClick={() => !loading && setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 rounded-full border border-white/12 bg-white/[0.07] px-3 py-2.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition-all duration-300 hover:bg-white/[0.1]"
      >
        <span className="flex min-w-0 items-center gap-3">
          <TopicIcon iconUrl={selectedTopic?.iconUrl ?? null} size={32} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-white">
              {loading
                ? "Đang tải chủ đề..."
                : selectedTopic?.name || "Chọn chủ đề"}
            </span>
            <span className="block truncate text-xs text-[#a7a3bd]">
              {selectedTopic?.parentName
                ? `${selectedTopic.parentName} · ${selectedTopic.questionCount} câu`
                : selectedTopic
                  ? `${selectedTopic.questionCount} câu khả dụng`
                  : "Parent topic, logo và số câu"}
            </span>
          </span>
        </span>
        <ChevronDown
          size={17}
          className="shrink-0 text-[#c4b5fd] transition-transform duration-300"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-3xl border border-white/14 bg-[#0f172a]/95 shadow-[0_26px_72px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
          <div className="border-b border-white/10 p-3">
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#77718f]"
              />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm chủ đề..."
                className="h-10 w-full rounded-full border border-white/10 bg-white/[0.06] pl-9 pr-3 text-sm text-white outline-none placeholder:text-[#77718f] focus:border-[#c4b5fd]/50"
              />
            </div>
          </div>

          <div className="max-h-[360px] overflow-y-auto py-2">
            {hasGroupedTopics ? (
              <>
                {visibleStandalone.map((topic) => (
                  <TopicOption
                    key={topic.id}
                    topic={topic}
                    active={topic.id === value}
                    onSelect={() => selectTopic(topic.id)}
                  />
                ))}
                {grouped.map((group) => (
                  <div key={group.parent.id}>
                    <div className="flex items-center gap-2 px-4 pb-1 pt-3">
                      <TopicIcon iconUrl={group.parent.iconUrl} size={18} />
                      <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8f86ad]">
                        {group.parent.name}
                      </span>
                      <span className="h-px flex-1 bg-white/10" />
                    </div>
                    {group.children.map((topic) => (
                      <TopicOption
                        key={topic.id}
                        topic={topic}
                        active={topic.id === value}
                        onSelect={() => selectTopic(topic.id)}
                      />
                    ))}
                  </div>
                ))}
              </>
            ) : (
              topics
                .filter(match)
                .map((topic) => (
                  <TopicOption
                    key={topic.id}
                    topic={topic}
                    active={topic.id === value}
                    onSelect={() => selectTopic(topic.id)}
                  />
                ))
            )}

            {visibleCount === 0 && (
              <p className="px-4 py-6 text-center text-sm text-[#a7a3bd]">
                Không tìm thấy chủ đề phù hợp.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

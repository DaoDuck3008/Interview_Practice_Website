"use client";

import Image from "next/image";
import { Check, FileQuestion } from "lucide-react";
import type { TopicWithCount } from "@/lib/api/topics";

export function TopicIcon({
  iconUrl,
  size,
}: {
  iconUrl: string | null;
  size: number;
}) {
  if (iconUrl) {
    return (
      <Image
        src={iconUrl}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-lg object-contain"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className="grid shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.08] text-[#c4b5fd]"
      style={{ width: size, height: size }}
    >
      <FileQuestion size={Math.max(13, Math.round(size * 0.56))} />
    </span>
  );
}

export default function TopicOption({
  topic,
  active,
  onSelect,
}: {
  topic: TopicWithCount;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors duration-200 hover:bg-white/[0.06]"
      style={active ? { background: "rgba(124,58,237,0.18)" } : undefined}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <TopicIcon iconUrl={topic.iconUrl} size={24} />
        <span className="min-w-0">
          <span
            className="block truncate text-sm font-semibold"
            style={{ color: active ? "#fff" : "#d8d6ea" }}
          >
            {topic.name}
          </span>
          {topic.parentName && (
            <span className="block truncate text-[11px] text-[#77718f]">
              {topic.parentName}
            </span>
          )}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <span
          className="rounded-full px-2 py-1 text-[11px] font-bold"
          style={{
            background: active ? "#7c3aed" : "rgba(255,255,255,0.08)",
            color: active ? "#fff" : "#a7a3bd",
          }}
        >
          {topic.questionCount}
        </span>
        {active && <Check size={15} className="text-[#c4b5fd]" />}
      </span>
    </button>
  );
}

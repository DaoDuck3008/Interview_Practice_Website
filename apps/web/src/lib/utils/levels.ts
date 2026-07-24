import type { Level } from "@/lib/api/questions";

export type LevelBadgeValue = Level | "MIX";

export const LEVEL_STYLE: Record<
  LevelBadgeValue,
  { label: string; className: string }
> = {
  MIX: {
    label: "Mix",
    className: "bg-[#c4b5fd]/10 text-[#c4b5fd] border border-[#c4b5fd]/30",
  },
  EASY: {
    label: "Easy",
    className: "bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/30",
  },
  MEDIUM: {
    label: "Medium",
    className: "bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/30",
  },
  HARD: {
    label: "Hard",
    className: "bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/30",
  },
};

export const LEVEL_DOT: Record<LevelBadgeValue, string> = {
  MIX: "bg-[#c4b5fd]",
  EASY: "bg-[#22c55e]",
  MEDIUM: "bg-[#f59e0b]",
  HARD: "bg-[#ef4444]",
};

export const LEVELS: { value: Level | "ALL"; label: string }[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "EASY", label: "Easy" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HARD", label: "Hard" },
];

import type { Level } from "@/lib/api/questions";

export const LEVEL_STYLE: Record<Level, { label: string; className: string }> =
  {
    COMMON: {
      label: "Common",
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

export const LEVEL_DOT: Record<Level, string> = {
  COMMON: "bg-[#22c55e]",
  MEDIUM: "bg-[#8b5cf6]",
  HARD: "bg-[#ef4444]",
};

export const LEVELS: { value: Level | "ALL"; label: string }[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "COMMON", label: "Common" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HARD", label: "Hard" },
];

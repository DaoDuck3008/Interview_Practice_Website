import type { Level } from "@/lib/api/questions";

export const LEVEL_STYLE: Record<Level, { label: string; className: string }> =
  {
    JUNIOR: {
      label: "Junior",
      className: "bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/30",
    },
    MID: {
      label: "Mid",
      className: "bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/30",
    },
    SENIOR: {
      label: "Senior",
      className: "bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/30",
    },
  };

export const LEVEL_DOT: Record<Level, string> = {
  JUNIOR: "bg-[#22c55e]",
  MID: "bg-[#8b5cf6]",
  SENIOR: "bg-[#ef4444]",
};

export const LEVELS: { value: Level | "ALL"; label: string }[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "JUNIOR", label: "Junior" },
  { value: "MID", label: "Mid" },
  { value: "SENIOR", label: "Senior" },
];

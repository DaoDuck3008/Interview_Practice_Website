import type { Level } from "@/lib/api/questions";

export const LEVEL_STYLE: Record<Level, { label: string; className: string }> =
  {
    INTERN: {
      label: "Intern",
      className: "bg-[#38bdf8]/10 text-[#38bdf8] border border-[#38bdf8]/30",
    },
    FRESHER: {
      label: "Fresher",
      className: "bg-[#2dd4bf]/10 text-[#2dd4bf] border border-[#2dd4bf]/30",
    },
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
    OTHER: {
      label: "Other",
      className: "bg-[#9898aa]/10 text-[#9898aa] border border-[#9898aa]/30",
    },
  };

export const LEVEL_DOT: Record<Level, string> = {
  INTERN: "bg-[#38bdf8]",
  FRESHER: "bg-[#2dd4bf]",
  JUNIOR: "bg-[#22c55e]",
  MID: "bg-[#8b5cf6]",
  SENIOR: "bg-[#ef4444]",
  OTHER: "bg-[#9898aa]",
};

export const LEVELS: { value: Level | "ALL"; label: string }[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "INTERN", label: "Intern" },
  { value: "FRESHER", label: "Fresher" },
  { value: "JUNIOR", label: "Junior" },
  { value: "MID", label: "Mid" },
  { value: "SENIOR", label: "Senior" },
  { value: "OTHER", label: "Other" },
];

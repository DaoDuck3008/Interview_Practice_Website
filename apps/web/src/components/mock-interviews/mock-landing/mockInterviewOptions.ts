import type { MockInterviewLevelOption } from "@/lib/api/mockInterviews";

export const LEVEL_OPTIONS: Array<{
  value: MockInterviewLevelOption;
  label: string;
  detail: string;
}> = [
  { value: "MIX", label: "Mix", detail: "Đủ Easy, Medium, Hard" },
  { value: "EASY", label: "Easy", detail: "Khởi động nhẹ" },
  { value: "MEDIUM", label: "Medium", detail: "Sát phỏng vấn nhất" },
  { value: "HARD", label: "Hard", detail: "Đào sâu trade-off" },
];

export const QUESTION_OPTIONS = [3, 6, 9, 12];

export const DURATION_OPTIONS = [
  { value: 600, label: "10 phút" },
  { value: 900, label: "15 phút" },
  { value: 1800, label: "30 phút" },
  { value: 2700, label: "45 phút" },
];

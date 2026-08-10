export type QuestionFilter = "ALL" | "SCORED" | "PENDING" | "SKIPPED" | "FAILED";

export const RESULT_FILTERS: Array<{ value: QuestionFilter; label: string }> = [
  { value: "ALL", label: "Tất cả" },
  { value: "SCORED", label: "Đã chấm" },
  { value: "PENDING", label: "Đang chấm" },
  { value: "SKIPPED", label: "Bỏ qua" },
  { value: "FAILED", label: "Lỗi" },
];

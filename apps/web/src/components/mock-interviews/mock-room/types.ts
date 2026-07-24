import type { MockInterview, MockInterviewQuestion } from "@/lib/api/mockInterviews";

export type UploadState = "idle" | "uploading" | "done" | "error";

export type MockRoomQuestionListProps = {
  mock: MockInterview;
  remaining: number | null;
  answeredCount: number;
  activeIndex: number;
  orderedQuestions: MockInterviewQuestion[];
  submitting: boolean;
  onSelect: (index: number) => void;
  onSubmit: () => void;
};

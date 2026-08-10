import type {
  InterviewQuestionView,
  InterviewSessionView,
} from "@/lib/interview-core/types";

export type UploadState = "idle" | "uploading" | "done" | "error";

export type MockRoomQuestionListProps = {
  mock: InterviewSessionView;
  remaining: number | null;
  answeredCount: number;
  activeIndex: number;
  orderedQuestions: InterviewQuestionView[];
  submitting: boolean;
  onSelect: (index: number) => void;
  onSubmit: () => void;
};

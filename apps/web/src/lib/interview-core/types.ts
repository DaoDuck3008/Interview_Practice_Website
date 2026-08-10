import type {
  MockInterviewStatus,
  MockOverviewStatus,
  MockQuestionAnswerStatus,
  MockQuestionScoreStatus,
} from "@/lib/api/mockInterviews";
import type { Level } from "@/lib/api/questions";
import type { Score } from "@/lib/api/sessions";
import type { Topic } from "@/lib/api/topics";

export interface InterviewQuestionView {
  id: string;
  order: number;
  answerStatus: MockQuestionAnswerStatus;
  scoreStatus: MockQuestionScoreStatus;
  scoreError: string | null;
  answeredAt: string | null;
  skippedAt: string | null;
  question: {
    id: string;
    content: string;
    level: Level | null;
    topic?: Pick<Topic, "id" | "name" | "slug" | "iconUrl"> | null;
  };
  session: {
    id: string;
    audioUrl: string;
    transcript: string;
    duration: number;
    createdAt: string;
    score: Score | null;
  } | null;
}

/** Dữ liệu trình bày ổn định để room/result không phụ thuộc DTO của từng domain. */
export interface InterviewSessionView {
  id: string;
  title: string;
  status: MockInterviewStatus;
  level: Level | null;
  totalQuestions: number;
  durationSeconds: number;
  startedAt: string | null;
  expiresAt: string | null;
  submittedAt: string | null;
  scoredAt: string | null;
  averageTechnicalScore: number | null;
  averageCompletenessScore: number | null;
  averageClarityScore: number | null;
  overallScore: number | null;
  summary: string | null;
  strengths: string[];
  weaknesses: string[];
  nextRecommendations: string[];
  overviewStatus: MockOverviewStatus;
  overviewError: string | null;
  createdAt: string;
  updatedAt?: string;
  topic: Topic | null;
  topics: Topic[];
  contextLabel?: string;
  questions?: InterviewQuestionView[];
}

export interface InterviewAnswerUpload {
  id: string;
  audioUrl: string;
  transcript: string;
  duration: number;
  createdAt: string;
}

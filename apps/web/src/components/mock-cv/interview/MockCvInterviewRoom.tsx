"use client";

import InterviewRoomSession from "@/components/interview-core/room/InterviewRoomSession";
import {
  answerMockCvQuestion,
  getMockCvInterview,
  submitMockCvInterview,
} from "@/lib/api/mockCvInterviews";
import type { InterviewSessionView } from "@/lib/interview-core/types";
import { toMockCvInterviewView } from "@/lib/utils/mockCvInterview";

async function loadMockCvInterview(id: string): Promise<InterviewSessionView> {
  return toMockCvInterviewView(await getMockCvInterview(id));
}

export default function MockCvInterviewRoom({ id }: { id: string }) {
  return (
    <InterviewRoomSession
      id={id}
      listPath="/mock-cv"
      roomPath={`/mock-cv/interviews/${id}`}
      resultPath={`/mock-cv/interviews/${id}/result`}
      loadInterview={loadMockCvInterview}
      answerQuestion={answerMockCvQuestion}
      submitInterview={submitMockCvInterview}
    />
  );
}

"use client";

import InterviewRoomSession from "@/components/interview-core/room/InterviewRoomSession";
import {
  answerMockQuestion,
  getMockInterview,
  startMockInterview,
  submitMockInterview,
} from "@/lib/api/mockInterviews";

export default function MockInterviewRoom({ id }: { id: string }) {
  return (
    <InterviewRoomSession
      id={id}
      listPath="/mock-interviews"
      roomPath={`/mock-interviews/${id}`}
      resultPath={`/mock-interviews/${id}/result`}
      loadInterview={getMockInterview}
      startInterview={startMockInterview}
      answerQuestion={answerMockQuestion}
      submitInterview={submitMockInterview}
    />
  );
}

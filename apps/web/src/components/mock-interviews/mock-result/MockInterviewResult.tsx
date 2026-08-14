"use client";

import InterviewResultSession, {
  type InterviewResultPayload,
} from "@/components/interview-core/result/InterviewResultSession";
import {
  getMockInterviewResult,
  retryMockInterviewScoring,
} from "@/lib/api/mockInterviews";

async function fetchMockInterviewResult(
  id: string,
): Promise<InterviewResultPayload> {
  return { session: await getMockInterviewResult(id) };
}

async function retryScoring(id: string): Promise<InterviewResultPayload> {
  return { session: await retryMockInterviewScoring(id) };
}

export default function MockInterviewResult({ id }: { id: string }) {
  return (
    <InterviewResultSession
      id={id}
      listPath="/mock-interviews"
      roomPath={`/mock-interviews/${id}`}
      resultPath={`/mock-interviews/${id}/result`}
      fetchResult={fetchMockInterviewResult}
      retryScoring={retryScoring}
      scoredEvent="mock-interview:scored"
    />
  );
}

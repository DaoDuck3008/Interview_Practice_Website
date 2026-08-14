"use client";

import InterviewResultSession, {
  type InterviewResultPayload,
} from "@/components/interview-core/result/InterviewResultSession";
import {
  getMockCvInterviewResult,
  retryMockCvInterviewScoring,
  type MockCvInterview,
} from "@/lib/api/mockCvInterviews";
import { toMockCvInterviewView } from "@/lib/utils/mockCvInterview";
import MockCvResultDetails, {
  type MockCvResultDetailsData,
} from "./MockCvResultDetails";

function toResultPayload(
  interview: MockCvInterview,
): InterviewResultPayload<MockCvResultDetailsData> {
  return {
    session: toMockCvInterviewView(interview),
    details: {
      readiness: interview.readiness ?? null,
      claimsToPrepareEvidence: interview.claimsToPrepareEvidence ?? [],
    },
  };
}

async function fetchResult(id: string) {
  return toResultPayload(await getMockCvInterviewResult(id));
}

async function retryScoring(id: string) {
  return toResultPayload(await retryMockCvInterviewScoring(id));
}

export default function MockCvInterviewResult({ id }: { id: string }) {
  return (
    <InterviewResultSession
      id={id}
      listPath="/mock-cv"
      roomPath={`/mock-cv/interviews/${id}`}
      resultPath={`/mock-cv/interviews/${id}/result`}
      fetchResult={fetchResult}
      retryScoring={retryScoring}
      scoredEvent="mock-cv-interview:scored"
      failedEvent="mock-cv-interview:failed"
      renderDetails={(details) => (
        <MockCvResultDetails details={details} />
      )}
    />
  );
}

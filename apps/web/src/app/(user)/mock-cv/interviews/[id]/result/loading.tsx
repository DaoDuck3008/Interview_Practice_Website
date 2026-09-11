import {
  MockResultShell,
  ResultSkeleton,
} from "@/components/interview-core/result/MockResultShell";

export default function LoadingMockCvInterviewResult() {
  return (
    <MockResultShell>
      <ResultSkeleton />
    </MockResultShell>
  );
}

import {
  MockResultShell,
  ResultSkeleton,
} from "@/components/interview-core/result/MockResultShell";

export default function LoadingMockInterviewResult() {
  return (
    <MockResultShell>
      <ResultSkeleton />
    </MockResultShell>
  );
}

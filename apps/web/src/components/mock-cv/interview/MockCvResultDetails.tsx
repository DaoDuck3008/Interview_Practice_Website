import { BadgeCheck, BriefcaseBusiness, FileCheck2 } from "lucide-react";
import { ResultGlassPanel } from "@/components/interview-core/result/MockResultShell";
import type { MockCvReadiness } from "@/lib/api/mockCvInterviews";

export interface MockCvResultDetailsData {
  readiness: MockCvReadiness | null;
  claimsToPrepareEvidence: string[];
}

const READINESS = {
  NOT_READY: {
    label: "Chưa sẵn sàng",
    description: "Bạn nên củng cố câu trả lời và bằng chứng trong CV trước buổi phỏng vấn thật.",
    className: "border-danger/30 bg-danger/10 text-danger",
  },
  NEEDS_PRACTICE: {
    label: "Cần luyện thêm",
    description: "Nền tảng đã có, nhưng một số nội dung trong CV vẫn cần được diễn giải thuyết phục hơn.",
    className: "border-yellow-300/30 bg-yellow-400/10 text-yellow-200",
  },
  READY: {
    label: "Sẵn sàng",
    description: "Câu trả lời đã thể hiện khá rõ các nội dung chính trong CV cho buổi phỏng vấn.",
    className: "border-success/30 bg-success/10 text-success",
  },
} satisfies Record<
  MockCvReadiness,
  { label: string; description: string; className: string }
>;

export default function MockCvResultDetails({
  details,
}: {
  details: MockCvResultDetailsData | undefined;
}) {
  if (!details?.readiness && !details?.claimsToPrepareEvidence.length) {
    return null;
  }

  const readiness = details.readiness ? READINESS[details.readiness] : null;

  return (
    <ResultGlassPanel className="overflow-hidden p-5 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-violet-200/75">
            <BriefcaseBusiness size={15} />
            Đánh giá theo CV
          </p>
          <h2 className="mt-2 text-xl font-black text-white">
            Mức sẵn sàng cho buổi phỏng vấn
          </h2>
          {readiness && (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/62">
              {readiness.description}
            </p>
          )}
        </div>

        {readiness && (
          <span
            className={`inline-flex shrink-0 items-center gap-2 self-start rounded-full border px-3 py-1.5 text-xs font-black ${readiness.className}`}
          >
            <BadgeCheck size={15} />
            {readiness.label}
          </span>
        )}
      </div>

      {!!details.claimsToPrepareEvidence.length && (
        <div className="mt-5 border-t border-white/10 pt-5">
          <p className="flex items-center gap-2 text-sm font-black text-white">
            <FileCheck2 size={17} className="text-violet-200" />
            Những điểm nên chuẩn bị bằng chứng
          </p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {details.claimsToPrepareEvidence.map((claim) => (
              <div
                key={claim}
                className="rounded-2xl border border-white/10 bg-white/[0.045] px-3.5 py-3 text-sm leading-6 text-white/68 backdrop-blur-xl"
              >
                {claim}
              </div>
            ))}
          </div>
        </div>
      )}
    </ResultGlassPanel>
  );
}

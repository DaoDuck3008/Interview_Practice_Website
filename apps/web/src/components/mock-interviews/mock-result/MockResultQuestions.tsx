import { BarChart3, FileText, Loader2 } from "lucide-react";
import type { MockInterviewQuestion } from "@/lib/api/mockInterviews";
import { LEVEL_STYLE } from "@/lib/utils/levels";
import { mockQuestionStatusBadge } from "@/lib/utils/mockInterview";
import { ResultGlassPanel, SkeletonBlock } from "./MockResultShell";
import { averageScore, ScoreBar } from "./MockResultScore";
import { RESULT_FILTERS, type QuestionFilter } from "./types";

// Section chi tiết từng câu trong trang /mock-interviews/[id]/result, gồm filter và danh sách card.
export function QuestionResultsSection({
  filter,
  onFilterChange,
  visibleQuestions,
}: {
  filter: QuestionFilter;
  onFilterChange: (filter: QuestionFilter) => void;
  visibleQuestions: MockInterviewQuestion[];
}) {
  return (
    <ResultGlassPanel className="p-4 md:p-5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-200/80">
            Chi tiết từng câu
          </p>
          <h2 className="mt-1 text-xl font-black text-white">
            Transcript, audio và điểm từng câu
          </h2>
        </div>
        <div className="flex gap-1 overflow-x-auto rounded-full border border-white/10 bg-white/[0.045] p-1 backdrop-blur-xl">
          {RESULT_FILTERS.map((item) => (
            <button
              key={item.value}
              onClick={() => onFilterChange(item.value)}
              className={[
                "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold transition-all duration-300",
                filter === item.value
                  ? "bg-violet-400/25 text-white shadow-lg shadow-violet-950/20"
                  : "text-white/55 hover:bg-white/[0.07] hover:text-white",
              ].join(" ")}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {visibleQuestions.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-white/15 bg-white/[0.035] px-4 py-8 text-center text-sm text-white/45">
            Không có câu hỏi nào trong bộ lọc này.
          </p>
        ) : (
          visibleQuestions.map((item) => (
            <QuestionResultCard key={item.id} item={item} />
          ))
        )}
      </div>
    </ResultGlassPanel>
  );
}

// Card kết quả từng câu, gom câu hỏi, transcript, audio và điểm AI của câu đó.
function QuestionResultCard({ item }: { item: MockInterviewQuestion }) {
  const score = item.session?.score ?? null;
  const average = score ? averageScore(score) : null;
  const levelStyle = LEVEL_STYLE[item.question.level];

  return (
    <article className="rounded-[1.5rem] border border-white/12 bg-white/[0.045] p-4 shadow-xl shadow-slate-950/15 backdrop-blur-xl">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/15 bg-white/[0.055] px-2.5 py-1 text-xs font-bold text-white">
              Câu {item.order}
            </span>
            <span
              className={[
                "rounded-full px-2.5 py-1 text-xs font-bold",
                levelStyle.className,
              ].join(" ")}
            >
              {levelStyle.label}
            </span>
            <QuestionStatusChip item={item} />
          </div>
          <h3 className="text-base font-bold leading-relaxed text-white">
            {item.question.content}
          </h3>
        </div>

        <div className="flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-3 py-2">
          <BarChart3 size={15} className="text-violet-200/70" />
          <span className="font-mono text-lg font-black tabular-nums text-white">
            {average === null ? "--" : average.toFixed(1)}
          </span>
        </div>
      </div>

      {item.session ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-3">
            <div className="rounded-[1.25rem] border border-yellow-200/20 bg-yellow-400/10 p-4 shadow-lg shadow-yellow-950/10 backdrop-blur-xl">
              <p className="mb-2 flex items-center gap-2 text-xs font-bold text-white">
                <FileText size={14} className="text-violet-200/70" />
                Transcript
              </p>
              <p className="whitespace-pre-wrap text-sm leading-7 text-white/72">
                {item.session.transcript || "Không có transcript."}
              </p>
            </div>

            {item.session.audioUrl && (
              <audio
                controls
                src={item.session.audioUrl}
                className="h-10 w-full"
              />
            )}

            {score?.summary && (
              <blockquote className="rounded-[1.25rem] border border-violet-200/15 bg-violet-400/10 p-3 text-sm leading-6 text-white/70 shadow-lg shadow-violet-950/10 backdrop-blur-xl">
                {score.summary}
              </blockquote>
            )}

            {item.scoreError && (
              <p className="rounded-2xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                {item.scoreError}
              </p>
            )}
          </div>

          <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl">
            {score ? (
              <div className="space-y-3">
                <ScoreBar label="Kỹ thuật" value={score.technicalScore} compact />
                <ScoreBar label="Đầy đủ" value={score.completenessScore} compact />
                <ScoreBar label="Rõ ràng" value={score.clarityScore} compact />
                <KeywordBlock title="Đã chạm" items={score.matchedKeywords} />
                <KeywordBlock title="Còn thiếu" items={score.missedKeywords} />
                <ImprovementList items={score.improvements} />
              </div>
            ) : (
              <ScorePendingSkeleton />
            )}
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-3xl border border-dashed border-white/15 bg-white/[0.035] px-4 py-5 text-sm text-white/45">
          {item.answerStatus === "SKIPPED"
            ? "Câu này đã bị bỏ qua khi nộp bài."
            : "Chưa có câu trả lời cho câu này."}
        </p>
      )}
    </article>
  );
}

function QuestionStatusChip({ item }: { item: MockInterviewQuestion }) {
  const badge = mockQuestionStatusBadge(item);
  return <span className={badge.className}>{badge.label}</span>;
}

function ScorePendingSkeleton() {
  return (
    <div className="space-y-3">
      <SkeletonBlock className="h-4 rounded-full" />
      <SkeletonBlock className="h-4 rounded-full" />
      <SkeletonBlock className="h-4 rounded-full" />
      <p className="flex items-center gap-2 text-xs text-white/45">
        <Loader2 size={13} className="animate-spin text-violet-200" />
        Đang chờ kết quả chấm.
      </p>
    </div>
  );
}

function KeywordBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold text-white/62">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-white/45">Không có.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.slice(0, 8).map((item) => (
            <span
              key={item}
              className="rounded-full border border-white/10 bg-white/[0.055] px-2.5 py-1 text-xs text-white/62"
            >
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ImprovementList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-bold text-white/62">Gợi ý cải thiện</p>
      <ul className="space-y-1.5">
        {items.slice(0, 3).map((item, index) => (
          <li key={index} className="text-xs leading-5 text-white/45">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

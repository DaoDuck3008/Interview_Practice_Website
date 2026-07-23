function SkeletonPill({ className = "" }: { className?: string }) {
  return (
    <div
      className={`skeleton-pulse rounded-full border border-white/10 bg-white/[0.07] ${className}`}
    />
  );
}

function SkeletonQuestionCard() {
  return (
    <div className="rounded-[24px] border border-white/[0.11] bg-[#0f172a]/50 px-4 py-3.5 backdrop-blur-2xl sm:px-6">
      <div className="flex items-center gap-3">
        <SkeletonPill className="h-4 w-9" />
        <SkeletonPill className="h-4 flex-1" />
        <SkeletonPill className="h-6 w-20" />
        <SkeletonPill className="h-8 w-8" />
      </div>
    </div>
  );
}

export default function LoadingLearningQuestions() {
  return (
    <div className="mt-4 flex items-start gap-3">
      {/* Skeleton mirrors the real filter/sidebar/card shapes during route refreshes. */}
      <aside className="sticky top-24 hidden h-[calc(100vh-7rem)] w-64 flex-shrink-0 rounded-[28px] border border-white/10 bg-[#0f172a]/50 p-3 backdrop-blur-2xl lg:block">
        <SkeletonPill className="mb-4 h-9 w-full" />
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, index) => (
            <SkeletonPill key={index} className="h-9 w-full" />
          ))}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="mb-2 overflow-hidden rounded-[28px] border border-white/[0.13] bg-[#0f172a]/55 backdrop-blur-2xl">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
            <SkeletonPill className="h-9 w-40" />
            <SkeletonPill className="h-9 flex-1" />
            <SkeletonPill className="h-9 w-28" />
          </div>
          <div className="flex gap-2 border-t border-white/[0.08] px-4 py-3 sm:px-5">
            <SkeletonPill className="h-9 w-24" />
            <SkeletonPill className="h-9 w-24" />
            <SkeletonPill className="h-9 w-28" />
            <SkeletonPill className="h-9 w-24" />
          </div>
        </div>

        {Array.from({ length: 9 }).map((_, index) => (
          <SkeletonQuestionCard key={index} />
        ))}
      </main>
    </div>
  );
}

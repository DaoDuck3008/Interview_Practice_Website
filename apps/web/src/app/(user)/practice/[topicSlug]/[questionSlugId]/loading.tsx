function SkeletonPill({ className = "" }: { className?: string }) {
  return (
    <div
      className={`skeleton-pulse rounded-full border border-white/10 bg-white/[0.07] ${className}`}
    />
  );
}

export default function LoadingPracticeQuestion() {
  return (
    <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-white/[0.13] bg-[#0f172a]/55 backdrop-blur-2xl">
      <div className="flex-1 overflow-y-auto">
        <div className="flex w-full flex-col gap-4 px-4 py-5 sm:px-8 lg:px-12">
          {/* Mirrors the question and recorder panels while the next practice route loads. */}
          <section className="flex flex-col gap-5 rounded-[24px] border border-white/10 bg-white/[0.055] px-5 py-5 backdrop-blur-xl sm:px-6">
            <div className="flex flex-wrap gap-2">
              <SkeletonPill className="h-8 w-24" />
              <SkeletonPill className="h-8 w-36" />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <SkeletonPill className="h-8 w-full rounded-2xl" />
                <SkeletonPill className="h-8 w-3/4 rounded-2xl" />
              </div>
              <SkeletonPill className="h-7 w-20" />
            </div>
          </section>

          <section className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.055] backdrop-blur-xl">
            <div className="flex flex-col items-center gap-3 px-6 py-12">
              <SkeletonPill className="h-20 w-20" />
              <SkeletonPill className="h-4 w-48 rounded-xl" />
              <SkeletonPill className="h-3 w-36 rounded-xl" />
            </div>
          </section>
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center justify-between gap-3 border-t border-white/[0.08] bg-[#0f172a]/48 px-4 py-3 backdrop-blur-2xl">
        <SkeletonPill className="h-9 w-24" />
        <SkeletonPill className="h-4 flex-1 rounded-xl" />
        <SkeletonPill className="h-9 w-24" />
      </div>
    </main>
  );
}

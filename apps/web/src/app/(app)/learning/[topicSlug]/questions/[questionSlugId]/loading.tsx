function SkeletonPill({ className = "" }: { className?: string }) {
  return (
    <div
      className={`skeleton-pulse rounded-full border border-white/10 bg-white/[0.07] ${className}`}
    />
  );
}

export default function LoadingLearningQuestionDetail() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5 md:px-6 md:py-7 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      {/* Detail skeleton keeps navigation between list and detail visually steady. */}
      <article className="min-w-0 overflow-hidden rounded-[30px] border border-white/[0.13] bg-[#10162d]/95">
        <div className="border-b border-white/[0.08] px-4 py-5 sm:px-6">
          <div className="flex gap-2">
            <SkeletonPill className="h-8 w-24" />
            <SkeletonPill className="h-8 w-32" />
          </div>
          <div className="mt-5 flex gap-2">
            <SkeletonPill className="h-6 w-20" />
            <SkeletonPill className="h-6 w-24" />
          </div>
          <SkeletonPill className="mt-5 h-9 w-11/12 rounded-2xl" />
          <SkeletonPill className="mt-3 h-9 w-3/4 rounded-2xl" />
          <div className="mt-4 flex flex-wrap gap-2">
            <SkeletonPill className="h-7 w-24" />
            <SkeletonPill className="h-7 w-20" />
            <SkeletonPill className="h-7 w-28" />
          </div>
        </div>

        <div className="px-4 py-5 sm:px-6 sm:py-6">
          <div className="mb-6 rounded-[24px] border border-white/10 bg-white/[0.055] p-4">
            <SkeletonPill className="h-8 w-44" />
            <SkeletonPill className="mt-4 h-4 w-full rounded-xl" />
            <SkeletonPill className="mt-2 h-4 w-4/5 rounded-xl" />
          </div>
          <SkeletonPill className="h-7 w-40 rounded-xl" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <SkeletonPill
                key={index}
                className={`h-4 rounded-xl ${index % 3 === 0 ? "w-5/6" : "w-full"}`}
              />
            ))}
          </div>
        </div>
      </article>

      <aside className="flex flex-col gap-3 lg:sticky lg:top-24">
        <div className="rounded-[26px] border border-white/[0.12] bg-[#10162d]/95 p-4">
          <SkeletonPill className="h-5 w-28" />
          <SkeletonPill className="mt-2 h-3 w-full rounded-xl" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <SkeletonPill key={index} className="h-12 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </aside>
    </main>
  );
}

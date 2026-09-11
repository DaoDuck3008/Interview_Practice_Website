import { Skeleton } from "@/components/ui/Skeleton";

export function MockLandingSkeleton({ label }: { label: string }) {
  return (
    <main
      className="performance-page mx-2 py-3 text-white sm:mx-3 sm:py-5 md:py-8"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">{label}</span>
      <section className="min-h-[650px] overflow-hidden rounded-[2rem] border border-white/10 bg-[#0f172a]/90 p-4 shadow-[0_24px_90px_rgba(0,0,0,0.42)] sm:p-5 md:p-8 lg:p-10">
        <div className="grid min-h-[560px] gap-8 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-center">
          <div className="flex min-h-[300px] flex-col justify-between sm:min-h-[380px] lg:min-h-[560px]">
            <div className="max-w-2xl">
              <Skeleton className="h-8 w-40 rounded-full" />
              <Skeleton className="mt-6 h-12 w-5/6 rounded-2xl sm:h-16" />
              <Skeleton className="mt-3 h-12 w-2/3 rounded-2xl sm:h-16" />
              <Skeleton className="mt-6 h-4 w-full rounded-full" />
              <Skeleton className="mt-3 h-4 w-4/5 rounded-full" />
            </div>
            <div className="hidden gap-3 sm:grid sm:grid-cols-3 lg:flex">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton
                  key={index}
                  className="h-20 flex-1 rounded-2xl"
                />
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/12 bg-white/[0.055] p-5 backdrop-blur-2xl sm:p-6">
            <Skeleton className="h-7 w-48 rounded-xl" />
            <Skeleton className="mt-3 h-4 w-4/5 rounded-full" />
            <div className="mt-7 space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton
                  key={index}
                  className="h-12 w-full rounded-2xl"
                />
              ))}
            </div>
            <Skeleton className="mt-7 h-12 w-full rounded-full" />
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-44 rounded-[1.5rem]" />
        ))}
      </section>
    </main>
  );
}

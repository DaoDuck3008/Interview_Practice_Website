import { Skeleton } from "@/components/ui/Skeleton";

export function InterviewRoomSkeleton() {
  return (
    <main
      className="performance-page lg:pr-[21.5rem]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Đang tải phòng phỏng vấn</span>
      <section className="mx-auto flex min-h-[calc(100dvh-10rem)] max-w-5xl flex-col justify-center py-3 md:py-5">
        <article className="overflow-hidden rounded-[1.75rem] border border-white/12 bg-[#1b2248]/90">
          <div className="border-b border-white/10 px-4 py-4 md:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                <Skeleton className="h-7 w-24 rounded-full" />
                <Skeleton className="h-7 w-28 rounded-full" />
              </div>
              <Skeleton className="h-9 w-28 rounded-full" />
            </div>
          </div>
          <div className="space-y-4 px-4 py-6 md:px-6 md:py-8">
            <Skeleton className="h-5 w-28 rounded-full" />
            <Skeleton className="h-9 w-full rounded-2xl" />
            <Skeleton className="h-9 w-4/5 rounded-2xl" />
            <div className="mt-7 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
              <Skeleton className="mx-auto h-20 w-20 rounded-full" />
              <Skeleton className="mx-auto mt-5 h-4 w-48 rounded-full" />
              <Skeleton className="mx-auto mt-3 h-3 w-32 rounded-full" />
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-white/10 px-4 py-4 md:px-6">
            <Skeleton className="h-10 w-28 rounded-full" />
            <Skeleton className="h-4 w-36 rounded-full" />
            <Skeleton className="h-10 w-28 rounded-full" />
          </div>
        </article>
      </section>
    </main>
  );
}

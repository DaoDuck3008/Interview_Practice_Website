import { Skeleton } from "@/components/ui/Skeleton";

export default function LoadingPractice() {
  return (
    <main
      className="performance-page relative flex h-screen flex-col overflow-hidden bg-[#0f172a] p-3"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Đang mở khu vực luyện tập</span>
      <Skeleton className="h-14 w-full rounded-2xl" />
      <div className="mt-4 flex min-h-0 flex-1 gap-3">
        <aside className="hidden w-72 shrink-0 rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-3 lg:block">
          <Skeleton className="h-10 w-full rounded-full" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        </aside>
        <section className="flex min-w-0 flex-1 flex-col rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-5 sm:p-7">
          <div className="flex gap-2">
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-32 rounded-full" />
          </div>
          <Skeleton className="mt-6 h-9 w-full rounded-2xl" />
          <Skeleton className="mt-3 h-9 w-4/5 rounded-2xl" />
          <Skeleton className="mt-8 min-h-52 flex-1 rounded-[1.5rem]" />
          <div className="mt-5 flex justify-between">
            <Skeleton className="h-10 w-28 rounded-full" />
            <Skeleton className="h-10 w-28 rounded-full" />
          </div>
        </section>
      </div>
    </main>
  );
}

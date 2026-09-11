import { Skeleton } from "@/components/ui/Skeleton";

export default function LoadingMockCvProcessing() {
  return (
    <main
      className="performance-page mx-auto flex min-h-[calc(100vh-7rem)] w-full max-w-5xl items-center py-6 sm:py-10"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Đang chuẩn bị bài luyện theo CV</span>
      <section className="w-full rounded-[2rem] border border-[#c4b5fd]/16 bg-[#171d3d]/90 p-5 sm:p-7 lg:p-10">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-9 w-28 rounded-full" />
          <Skeleton className="h-8 w-32 rounded-full" />
        </div>
        <div className="mx-auto mt-10 max-w-2xl text-center">
          <Skeleton className="mx-auto h-16 w-16 rounded-2xl" />
          <Skeleton className="mx-auto mt-6 h-9 w-4/5 rounded-2xl" />
          <Skeleton className="mx-auto mt-4 h-4 w-3/5 rounded-full" />
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="mt-8 h-3 w-full rounded-full" />
      </section>
    </main>
  );
}

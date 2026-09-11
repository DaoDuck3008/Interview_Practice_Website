import { Skeleton } from "@/components/ui/Skeleton";

export default function LoadingPricing() {
  return (
    <main
      className="performance-page mx-auto flex min-h-[calc(100vh-96px)] max-w-6xl flex-col px-4 py-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Đang tải bảng giá</span>
      <div className="mx-auto mb-12 w-full max-w-2xl text-center">
        <Skeleton className="mx-auto h-8 w-28 rounded-full" />
        <Skeleton className="mx-auto mt-5 h-10 w-4/5 rounded-2xl" />
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[1.75rem] border border-white/10 bg-[#0b0d16]/90 p-6"
          >
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="mt-5 h-12 w-36 rounded-2xl" />
            <div className="mt-7 space-y-3">
              {Array.from({ length: 5 }).map((_, itemIndex) => (
                <Skeleton
                  key={itemIndex}
                  className="h-4 w-full rounded-full"
                />
              ))}
            </div>
            <Skeleton className="mt-8 h-11 w-full rounded-full" />
          </div>
        ))}
      </div>
    </main>
  );
}

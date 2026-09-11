import { Skeleton } from "@/components/ui/Skeleton";

export function CheckoutSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Đang tải thông tin thanh toán</span>
      <Skeleton className="mb-5 h-8 w-28 rounded-full" />
      <section className="rounded-2xl border border-[#c4b5fd]/16 bg-[#0a0c15]/95 p-6 md:p-8">
        <Skeleton className="mx-auto h-8 w-3/5 rounded-xl" />
        <Skeleton className="mx-auto mt-3 h-4 w-4/5 rounded-full" />
        <div className="mt-8 grid items-start gap-6 md:grid-cols-2">
          <div>
            <Skeleton className="mx-auto h-52 w-52 rounded-xl" />
            <Skeleton className="mx-auto mt-5 h-4 w-36 rounded-full" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full rounded-xl" />
            ))}
          </div>
        </div>
        <Skeleton className="mt-8 h-11 w-full rounded-full" />
      </section>
    </div>
  );
}

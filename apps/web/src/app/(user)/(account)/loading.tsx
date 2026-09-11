import { Skeleton } from "@/components/ui/Skeleton";

export default function LoadingAccountPage() {
  return (
    <main
      className="min-w-0 flex-1 space-y-5"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Đang tải thông tin tài khoản</span>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
      <Skeleton className="h-52 rounded-2xl" />
    </main>
  );
}

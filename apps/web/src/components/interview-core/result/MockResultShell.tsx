import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

// Shell nền riêng cho trang /mock-interviews/[id]/result, đồng bộ với phòng mock.
export function MockResultShell({ children }: { children: ReactNode }) {
  return (
    <main className="performance-page relative min-h-[calc(100dvh-3.5rem)] overflow-hidden rounded-3xl bg-base/30 px-3 py-4 text-white md:px-6 md:py-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(139,92,246,0.1),transparent_26%),radial-gradient(circle_at_12%_18%,rgba(124,58,237,0.1),transparent_32%)]" />
      <div className="relative z-10">{children}</div>
    </main>
  );
}

// Panel glass dùng chung cho các khối nội dung trong trang kết quả mock.
export function ResultGlassPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={[
        "relative rounded-[1.75rem] border border-[#c4b5fd]/16 bg-[#1b2248]/90 shadow-[0_14px_38px_rgba(2,6,23,0.3)]",
        className,
      ].join(" ")}
    >
      {children}
    </section>
  );
}

export function ScoringResultSkeleton() {
  return (
    <div
      className="mx-auto max-w-5xl space-y-4"
      role="status"
      aria-live="polite"
    >
      <ResultGlassPanel className="overflow-hidden px-5 py-8 text-center md:px-8 md:py-12">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.12),transparent_62%)]" />
        <div className="relative">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-accent/25 bg-accent/10 text-accent-light">
            <Loader2 size={25} className="animate-spin" />
          </span>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-accent-light">
            Đang xử lý kết quả
          </p>
          <h1 className="mx-auto mt-2 max-w-xl text-balance text-2xl font-black tracking-tight text-text-primary md:text-4xl">
            Hệ thống đang chấm câu trả lời của bạn
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-text-secondary md:text-white">
            Báo cáo chỉ được mở khi tất cả câu trả lời và phần nhận xét tổng
            quan đã hoàn tất. Kết quả sẽ tự xuất hiện, bạn không cần tải lại
            trang.
          </p>
          <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-text-secondary">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent-light opacity-50" />
              <span className="relative inline-flex size-2 rounded-full bg-accent-light" />
            </span>
            Đang chờ cập nhật trực tiếp
          </span>
        </div>
      </ResultGlassPanel>

      <div className="grid gap-4 md:grid-cols-2" aria-hidden="true">
        {Array.from({ length: 2 }).map((_, index) => (
          <ResultGlassPanel key={index} className="p-5">
            <SkeletonBlock className="h-5 w-36 rounded-full" />
            <SkeletonBlock className="mt-4 h-4 w-full rounded-full" />
            <SkeletonBlock className="mt-3 h-4 w-4/5 rounded-full" />
            <SkeletonBlock className="mt-6 h-20 rounded-2xl" />
          </ResultGlassPanel>
        ))}
      </div>
    </div>
  );
}

// Skeleton glass đúng shape của trang result khi đang tải dữ liệu.
export function ResultSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <SkeletonBlock className="h-10 w-44 rounded-full" />
        <SkeletonBlock className="h-10 w-28 rounded-full" />
      </div>

      <ResultGlassPanel className="p-5 md:p-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_16rem]">
          <div className="space-y-3">
            <SkeletonBlock className="h-5 w-32" />
            <SkeletonBlock className="h-12 max-w-2xl" />
            <SkeletonBlock className="h-5 max-w-lg" />
          </div>
          <SkeletonBlock className="h-36 rounded-[1.5rem]" />
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-20 rounded-3xl" />
          ))}
        </div>
      </ResultGlassPanel>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <ResultGlassPanel className="p-5">
          <SkeletonBlock className="h-6 w-52" />
          <div className="mt-4 space-y-4">
            <SkeletonBlock className="h-4" />
            <SkeletonBlock className="h-4" />
            <SkeletonBlock className="h-4" />
          </div>
        </ResultGlassPanel>
        <ResultGlassPanel className="p-5">
          <SkeletonBlock className="h-6 w-40" />
          <SkeletonBlock className="mt-4 h-32 rounded-3xl" />
        </ResultGlassPanel>
      </div>
    </div>
  );
}

export function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      className={[
        "skeleton-pulse border border-white/10 bg-white/[0.07]",
        className,
      ].join(" ")}
    />
  );
}

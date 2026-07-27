import type { ReactNode } from "react";

// Shell nền riêng cho trang /mock-interviews/[id]/result, đồng bộ với phòng mock.
export function MockResultShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-[calc(100dvh-3.5rem)] px-3 py-4 text-white md:px-6 md:py-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(circle_at_50%_-10%,rgba(248,250,252,0.3),transparent_22%),radial-gradient(circle_at_14%_14%,rgba(124,58,237,0.24),transparent_34%),radial-gradient(circle_at_86%_18%,rgba(59,130,246,0.13),transparent_32%)]" />
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
        "rounded-[1.75rem] border border-white/15 bg-white/[0.055] shadow-[0_18px_70px_rgba(15,23,42,0.34)] backdrop-blur-2xl",
        className,
      ].join(" ")}
    >
      {children}
    </section>
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

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={[
        "skeleton-pulse border border-white/10 bg-white/[0.07]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}

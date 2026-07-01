import { type LucideIcon } from "lucide-react";

const cardClass =
  "rounded-2xl p-6 md:p-8 backdrop-blur-xl border border-white/10";
const cardBg = { background: "rgba(255,255,255,0.05)" };

export default function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className={cardClass} style={cardBg}>
      <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
        <Icon size={16} />
        <span className="text-xs text-white font-bold uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="mt-3 text-2xl font-extrabold text-[var(--color-text-primary)]">
        {value}
      </p>
      {hint && (
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">{hint}</p>
      )}
    </div>
  );
}

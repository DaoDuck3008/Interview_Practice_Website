"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type Action =
  | { label: string; href: string; onClick?: undefined }
  | { label: string; onClick: () => void; href?: undefined };

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: Action;
  className?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center gap-3 py-14 text-center ${className}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent-light)]">
        <Icon size={22} />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
          {title}
        </p>
        {description && (
          <p className="max-w-sm text-sm text-[var(--color-text-muted)]">
            {description}
          </p>
        )}
      </div>
      {action &&
        (action.href ? (
          <Link
            href={action.href}
            className="mt-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-light)]"
          >
            {action.label}
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            className="mt-2 cursor-pointer rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-light)]"
          >
            {action.label}
          </button>
        ))}
    </div>
  );
}

import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { AnimateOnScroll } from "@/components/ui/AnimateOnScroll";

/**
 * Khung trang xác thực căn giữa, lấy phong cách từ trang Bảng giá:
 * badge + tiêu đề + mô tả, rồi một thẻ kính chứa nội dung form.
 */
export default function AuthCardShell({
  badge,
  title,
  subtitle,
  backHref,
  backLabel,
  children,
}: {
  badge: string;
  title: string;
  subtitle: string;
  backHref: string;
  backLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--color-base)]">
      <div className="mx-auto flex max-w-md flex-col px-4 py-10 md:py-16">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 self-start text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-secondary)]"
        >
          Interview<span className="text-[var(--color-accent-light)]">Prep</span>
        </Link>

        <AnimateOnScroll variant="fade-up">
          <div className="mb-8 text-center">
            <span className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-accent-light)]">
              <Sparkles size={14} />
              {badge}
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-[var(--color-text-primary)] md:text-3xl">
              {title}
            </h1>
            <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
              {subtitle}
            </p>
          </div>

          <div
            className="rounded-2xl border border-white/10 p-6 backdrop-blur-xl md:p-8"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            {children}
          </div>

          <Link
            href={backHref}
            className="mt-6 inline-flex items-center justify-center gap-1.5 self-center text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-secondary)] w-full"
          >
            <ArrowLeft size={14} />
            {backLabel}
          </Link>
        </AnimateOnScroll>
      </div>
    </div>
  );
}

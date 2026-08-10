"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  Ellipsis,
  Eye,
  FileText,
  Gauge,
  Loader2,
  Mic2,
  RotateCcw,
  Sparkles,
  Trash2,
  UploadCloud,
  type LucideIcon,
} from "lucide-react";
import type { MockCv } from "@/lib/api/mockCvs";
import { formatDay } from "@/lib/utils/format";

export default function MockCvCard({
  cv,
  busy,
  onStart,
  onRetry,
  onDelete,
  onReplace,
}: {
  cv: MockCv;
  busy: boolean;
  onStart: (cv: MockCv) => void;
  onRetry: (cv: MockCv) => void;
  onDelete: (cv: MockCv) => void;
  onReplace: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const latest = cv.latestInterview;
  const analysis = cv.analysis;

  useEffect(() => {
    if (!menuOpen) return;
    const closeMenu = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, [menuOpen]);

  const skills = analysis?.technicalSkills.slice(0, 3) ?? [];
  const remainingSkills = Math.max(
    0,
    (analysis?.technicalSkills.length ?? 0) - skills.length,
  );
  const isScored = latest?.status === "SCORED";
  const isInProgress =
    latest?.status === "DRAFT" || latest?.status === "IN_PROGRESS";
  const isScoring =
    latest?.status === "SUBMITTED" || latest?.status === "SCORING";

  return (
    <article className="group relative overflow-hidden rounded-[1.25rem] border border-white/10 bg-surface/80 p-4 shadow-[0_20px_55px_rgba(2,6,23,0.28),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-accent-light/30 hover:bg-elevated/85 sm:p-5">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-accent/5 [mask-image:linear-gradient(to_right,black,transparent)]" />

      <div className="relative flex items-center gap-3">
        <div className="relative grid size-13 shrink-0 place-items-center rounded-xl border border-accent-light/25 bg-accent/15 text-accent-light shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] sm:size-14">
          <FileText size={23} />
          <span className="absolute -bottom-1 -right-1 rounded-md border-2 border-surface bg-accent px-1.5 py-0.5 text-[8px] font-extrabold leading-none text-white">
            PDF
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-bold text-text-primary">
            {cv.targetRole}
          </h2>
          <p className="mt-1 truncate text-xs text-text-secondary">
            {cv.fileName}
          </p>
        </div>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            aria-label={`Tùy chọn cho ${cv.targetRole}`}
            aria-expanded={menuOpen}
            className="grid size-9 place-items-center rounded-full text-text-secondary transition-colors hover:bg-white/[0.08] hover:text-text-primary"
          >
            <Ellipsis size={19} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-10 z-20 w-40 overflow-hidden rounded-xl border border-white/10 bg-[#0f172a]/95 p-1.5 shadow-[0_16px_45px_rgba(2,6,23,0.48)] backdrop-blur-2xl">
              {isScored && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onStart(cv);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-text-secondary transition-colors hover:bg-white/[0.08] hover:text-text-primary"
                >
                  <RotateCcw size={14} />
                  Luyện lại
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(cv);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-text-secondary transition-colors hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 size={14} />
                Xóa CV
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="relative mt-3 grid grid-cols-3 overflow-hidden rounded-lg border border-white/[0.07] bg-white/[0.025]">
        <Meta icon={BriefcaseBusiness} text={`${cv._count.interviews} lần luyện`} />
        <Meta icon={CalendarDays} text={formatDay(cv.createdAt)} bordered />
        <Meta icon={FileText} text={formatFileSize(cv.fileSize)} bordered />
      </div>

      <div className="relative mt-2.5 flex min-h-7 items-center gap-1.5 overflow-hidden">
        {skills.length > 0 ? (
          <>
            {skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex h-7 max-w-36 shrink-0 items-center truncate rounded-full border border-accent-light/15 bg-accent/10 px-2.5 text-[11px] font-semibold text-text-primary"
              >
                {skill}
              </span>
            ))}
            {remainingSkills > 0 && (
              <span className="inline-flex h-7 shrink-0 items-center rounded-full border border-accent-light/20 bg-accent/15 px-2.5 text-[11px] font-semibold text-accent-light">
                +{remainingSkills}
              </span>
            )}
          </>
        ) : (
          <span className="text-xs text-text-muted">
            Kỹ năng sẽ xuất hiện sau khi CV được chuẩn bị.
          </span>
        )}
      </div>

      <div className="relative mt-3 flex items-center justify-between gap-3 border-t border-white/[0.07] pt-3">
        <CardSummary cv={cv} />
        <CardAction
          cv={cv}
          busy={busy}
          isScored={isScored}
          isInProgress={isInProgress}
          isScoring={isScoring}
          onStart={() => onStart(cv)}
          onRetry={() => onRetry(cv)}
          onReplace={onReplace}
        />
      </div>
    </article>
  );
}

function Meta({
  icon: Icon,
  text,
  bordered = false,
}: {
  icon: LucideIcon;
  text: string;
  bordered?: boolean;
}) {
  return (
    <span
      className={`flex min-w-0 items-center gap-2 px-2.5 py-2 text-[11px] font-semibold text-text-secondary ${
        bordered ? "border-l border-white/[0.07]" : ""
      }`}
    >
      <Icon size={14} className="shrink-0 text-text-muted" />
      <span className="truncate">{text}</span>
    </span>
  );
}

function CardSummary({ cv }: { cv: MockCv }) {
  const latest = cv.latestInterview;

  if (latest?.status === "SCORED") {
    return (
      <SummaryIcon
        icon={Gauge}
        tone="success"
        title={`Lần gần nhất: ${formatScore(latest.overallScore)}/10`}
        subtitle="Đã hoàn thành buổi luyện"
      />
    );
  }

  if (latest?.status === "DRAFT" || latest?.status === "IN_PROGRESS") {
    return (
      <SummaryIcon
        icon={Mic2}
        title="Buổi luyện đang dang dở"
        subtitle="Tiếp tục từ câu gần nhất"
      />
    );
  }

  if (latest?.status === "SUBMITTED" || latest?.status === "SCORING") {
    return (
      <SummaryIcon
        icon={Loader2}
        title="Đang hoàn thiện kết quả"
        subtitle="Bạn có thể quay lại sau"
      />
    );
  }

  if (cv.analysis?.status === "READY") {
    return (
      <SummaryIcon
        icon={Sparkles}
        title="Sẵn sàng để luyện"
        subtitle="Câu hỏi bám theo nội dung CV"
      />
    );
  }

  if (
    cv.analysis?.status === "NEEDS_REUPLOAD" ||
    cv.analysis?.status === "UNSUPPORTED"
  ) {
    return (
      <SummaryIcon
        icon={UploadCloud}
        title="Cần một file CV khác"
        subtitle="Hãy tải lại CV rõ ràng hơn"
      />
    );
  }

  if (cv.analysis?.status === "FAILED") {
    return (
      <SummaryIcon
        icon={RotateCcw}
        title="Chưa thể chuẩn bị CV"
        subtitle="Bạn có thể thử phân tích lại"
      />
    );
  }

  return (
    <SummaryIcon
      icon={Loader2}
      title="Đang chuẩn bị CV"
      subtitle="Thông tin sẽ tự động cập nhật"
    />
  );
}

function SummaryIcon({
  icon: Icon,
  tone = "accent",
  title,
  subtitle,
}: {
  icon: LucideIcon;
  tone?: "accent" | "success";
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span
        className={`grid size-8 shrink-0 place-items-center rounded-lg border ${
          tone === "success"
            ? "border-success/20 bg-success/10 text-success"
            : "border-accent-light/20 bg-accent/10 text-accent-light"
        }`}
      >
        <Icon size={16} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-semibold text-text-primary">
          {title}
        </span>
        <span className="mt-0.5 block truncate text-[10px] text-text-muted">
          {subtitle}
        </span>
      </span>
    </div>
  );
}

function CardAction({
  cv,
  busy,
  isScored,
  isInProgress,
  isScoring,
  onStart,
  onRetry,
  onReplace,
}: {
  cv: MockCv;
  busy: boolean;
  isScored: boolean;
  isInProgress: boolean;
  isScoring: boolean;
  onStart: () => void;
  onRetry: () => void;
  onReplace: () => void;
}) {
  const latest = cv.latestInterview;
  const baseClass =
    "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg px-3 text-xs font-semibold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";

  if (isScored && latest) {
    return (
      <Link
        href={`/mock-cv/interviews/${latest.id}/result`}
        className={`${baseClass} border border-success/30 bg-success/15 text-success hover:bg-success hover:text-white`}
      >
        <Eye size={15} />
        Xem kết quả
        <ArrowUpRight size={14} />
      </Link>
    );
  }

  if (isInProgress && latest) {
    return (
      <Link
        href={`/mock-cv/interviews/${latest.id}`}
        className={`${baseClass} bg-accent text-white hover:bg-accent-light`}
      >
        <Mic2 size={15} />
        Tiếp tục luyện
      </Link>
    );
  }

  if (isScoring) {
    return (
      <button
        type="button"
        disabled
        className={`${baseClass} border border-white/10 bg-white/[0.04] text-text-secondary`}
      >
        <Loader2 size={15} className="animate-spin" />
        Đang chấm
      </button>
    );
  }

  if (
    cv.analysis?.status === "NEEDS_REUPLOAD" ||
    cv.analysis?.status === "UNSUPPORTED"
  ) {
    return (
      <button
        type="button"
        onClick={onReplace}
        className={`${baseClass} border border-white/10 bg-white/[0.04] text-text-primary hover:border-accent-light/30 hover:bg-white/[0.08]`}
      >
        <UploadCloud size={15} />
        Tải CV khác
      </button>
    );
  }

  if (cv.analysis?.status === "FAILED") {
    return (
      <button
        type="button"
        onClick={onRetry}
        disabled={busy || !cv.analysis.canRetry}
        className={`${baseClass} border border-accent-light/25 bg-accent/10 text-accent-light hover:bg-accent/20`}
      >
        {busy ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <RotateCcw size={15} />
        )}
        Phân tích lại
      </button>
    );
  }

  if (cv.analysis?.status !== "READY") {
    return (
      <button
        type="button"
        disabled
        className={`${baseClass} border border-white/10 bg-white/[0.04] text-text-secondary`}
      >
        <Loader2 size={15} className="animate-spin" />
        Đang chuẩn bị
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onStart}
      disabled={busy}
      className={`${baseClass} bg-accent text-white hover:bg-accent-light`}
    >
      {busy ? (
        <Loader2 size={15} className="animate-spin" />
      ) : (
        <Mic2 size={15} />
      )}
      Luyện phỏng vấn
      <ArrowUpRight size={14} />
    </button>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

function formatScore(score: number | null) {
  return score === null ? "--" : score.toFixed(1).replace(".", ",");
}

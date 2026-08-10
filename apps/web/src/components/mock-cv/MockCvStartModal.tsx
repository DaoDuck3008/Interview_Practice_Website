"use client";

import { useEffect, useState } from "react";
import { Clock3, FileQuestion, Loader2, Mic2, X } from "lucide-react";
import ModalPortal from "@/components/ui/ModalPortal";
import type { MockCv } from "@/lib/api/mockCvs";

const QUESTION_OPTIONS = [4, 6, 8, 10];
const DURATION_OPTIONS = [
  { value: 600, label: "10 phút" },
  { value: 900, label: "15 phút" },
  { value: 1200, label: "20 phút" },
  { value: 1800, label: "30 phút" },
];

export default function MockCvStartModal({
  cv,
  submitting,
  onClose,
  onSubmit,
}: {
  cv: MockCv | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (input: {
    totalQuestions: number;
    durationSeconds: number;
  }) => Promise<void>;
}) {
  const fixedQuestionCount = cv?.analysis?.requestedQuestionCount ?? null;
  const [totalQuestions, setTotalQuestions] = useState(
    fixedQuestionCount ?? 6,
  );
  const [durationSeconds, setDurationSeconds] = useState(900);

  useEffect(() => {
    if (!cv) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [cv, onClose, submitting]);

  if (!cv) return null;

  const selectedQuestions = fixedQuestionCount ?? totalQuestions;

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[110] grid place-items-center bg-black/65 p-4 backdrop-blur-sm"
        onMouseDown={() => !submitting && onClose()}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="mock-cv-start-title"
          className="w-full max-w-md overflow-hidden rounded-[1.5rem] border border-white/12 bg-[#0f172a]/92 shadow-[0_28px_90px_rgba(2,6,23,0.58),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-2xl"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
            <div className="min-w-0">
              <h2
                id="mock-cv-start-title"
                className="text-lg font-bold text-text-primary"
              >
                Cấu hình buổi luyện
              </h2>
              <p className="mt-1 truncate text-sm text-text-secondary">
                {cv.targetRole}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              aria-label="Đóng cấu hình buổi luyện"
              className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-text-secondary transition-colors hover:bg-white/[0.1] hover:text-text-primary disabled:opacity-50"
            >
              <X size={17} />
            </button>
          </div>

          <div className="space-y-5 p-5">
            <fieldset>
              <legend className="mb-2 flex items-center gap-2 text-sm font-semibold text-text-primary">
                <FileQuestion size={16} className="text-accent-light" />
                Số câu hỏi
              </legend>
              <div className="grid grid-cols-4 gap-2">
                {QUESTION_OPTIONS.map((value) => {
                  const active = selectedQuestions === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setTotalQuestions(value)}
                      disabled={fixedQuestionCount !== null || submitting}
                      className={`h-10 rounded-lg border text-sm font-semibold transition-colors ${
                        active
                          ? "border-accent-light/50 bg-accent/20 text-text-primary"
                          : "border-white/10 bg-white/[0.035] text-text-secondary hover:bg-white/[0.08] hover:text-text-primary"
                      } disabled:cursor-default`}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
              {fixedQuestionCount !== null && (
                <p className="mt-2 text-xs leading-5 text-text-muted">
                  Bộ câu hỏi của CV này đã được cố định ở {fixedQuestionCount} câu.
                </p>
              )}
            </fieldset>

            <fieldset>
              <legend className="mb-2 flex items-center gap-2 text-sm font-semibold text-text-primary">
                <Clock3 size={16} className="text-accent-light" />
                Thời lượng
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {DURATION_OPTIONS.map((option) => {
                  const active = durationSeconds === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setDurationSeconds(option.value)}
                      disabled={submitting}
                      className={`h-10 rounded-lg border text-sm font-semibold transition-colors ${
                        active
                          ? "border-accent-light/50 bg-accent/20 text-text-primary"
                          : "border-white/10 bg-white/[0.035] text-text-secondary hover:bg-white/[0.08] hover:text-text-primary"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <button
              type="button"
              onClick={() =>
                onSubmit({
                  totalQuestions: selectedQuestions,
                  durationSeconds,
                })
              }
              disabled={submitting}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent text-sm font-semibold text-white transition-all hover:bg-accent-light active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Mic2 size={17} />
              )}
              {submitting ? "Đang chuẩn bị..." : "Bắt đầu luyện"}
            </button>
          </div>
        </section>
      </div>
    </ModalPortal>
  );
}

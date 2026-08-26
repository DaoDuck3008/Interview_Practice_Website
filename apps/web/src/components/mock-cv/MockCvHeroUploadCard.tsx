"use client";

import { useCallback, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  BriefcaseBusiness,
  ChevronDown,
  Clock3,
  Coins,
  FileCheck2,
  FileQuestion,
  FileText,
  LoaderCircle,
  ScanSearch,
  TriangleAlert,
  UploadCloud,
  X,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import {
  MOCK_CV_DURATION_OPTIONS,
  MOCK_CV_QUESTION_OPTIONS,
  MOCK_CV_TARGET_ROLE_GROUPS,
  type CreateMockCvInput,
  type MockCvTargetRoleCode,
} from "@/lib/api/mockCvs";
import {
  getMockCvAnalysisCost,
  type AiCreditBalance,
  type AiCreditPricing,
} from "@/lib/api/aiCredits";
import { formatNumber } from "@/lib/utils/format";

const MAX_CV_SIZE = 5 * 1024 * 1024;

export default function MockCvHeroUploadCard({
  submitting,
  onSubmit,
  creditBalance,
  creditPricing,
}: {
  submitting: boolean;
  onSubmit: (input: CreateMockCvInput) => Promise<boolean>;
  creditBalance: AiCreditBalance | null;
  creditPricing: AiCreditPricing | null;
}) {
  const [targetRoleCode, setTargetRoleCode] = useState<
    MockCvTargetRoleCode | ""
  >("");
  const [file, setFile] = useState<File | null>(null);
  const [totalQuestions, setTotalQuestions] =
    useState<(typeof MOCK_CV_QUESTION_OPTIONS)[number]>(10);
  const [durationSeconds, setDurationSeconds] =
    useState<(typeof MOCK_CV_DURATION_OPTIONS)[number]["value"]>(900);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFile(acceptedFiles[0] ?? null);
  }, []);

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      accept: { "application/pdf": [".pdf"] },
      maxSize: MAX_CV_SIZE,
      maxFiles: 1,
      multiple: false,
      disabled: submitting,
    });

  const rejection = fileRejections[0]?.errors[0]?.code;
  const fileError =
    rejection === "file-too-large"
      ? "CV vượt quá dung lượng tối đa 5 MB."
      : rejection === "file-invalid-type"
        ? "Chỉ chấp nhận CV định dạng PDF."
        : rejection
          ? "File CV không hợp lệ."
          : null;
  const creditCost = getMockCvAnalysisCost(totalQuestions, creditPricing);
  const hasEnoughCredits =
    creditCost === null ||
    creditBalance === null ||
    creditBalance.available >= creditCost;
  const canSubmit =
    !!targetRoleCode && !!file && !submitting && hasEnoughCredits;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !canSubmit) return;

    const succeeded = await onSubmit({
      targetRoleCode,
      totalQuestions,
      durationSeconds,
      cv: file,
    });
    if (!succeeded) return;

    setTargetRoleCode("");
    setFile(null);
  }

  return (
    <section
      id="mock-cv-upload-card"
      aria-busy={submitting}
      className="relative animate-[cardPushIn_650ms_120ms_cubic-bezier(.2,.8,.2,1)_both] overflow-hidden rounded-[1.5rem] border border-white/14 bg-[#0f172a]/58 p-3 shadow-[0_24px_80px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl sm:rounded-[1.75rem] sm:p-4 md:p-5"
    >
      <div className="mb-4 flex items-start justify-between gap-4 sm:mb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#c4b5fd]">
            Tạo bộ luyện mới
          </p>
          <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">
            Thêm CV của bạn
          </h2>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-full border border-white/12 bg-white/[0.08] text-[#c4b5fd] shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] sm:size-12">
          <ScanSearch size={21} />
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block" htmlFor="mock-cv-target-role">
          <span className="mb-2 block text-sm font-semibold text-text-primary">
            Vị trí ứng tuyển
          </span>
          <span className="group relative block">
            <BriefcaseBusiness
              size={17}
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-violet-200/75 transition-colors group-focus-within:text-violet-200"
            />
            <select
              id="mock-cv-target-role"
              value={targetRoleCode}
              onChange={(event) =>
                setTargetRoleCode(
                  event.target.value as MockCvTargetRoleCode | "",
                )
              }
              disabled={submitting}
              required
              className="h-12 w-full cursor-pointer appearance-none rounded-2xl border border-white/12 bg-white/[0.06] pl-11 pr-11 text-sm font-semibold text-text-primary outline-none transition-all duration-300 hover:bg-white/[0.08] focus:border-violet-300/55 focus:bg-white/[0.085] focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="" className="bg-elevated text-text-muted">
                Chọn vị trí bạn muốn luyện tập
              </option>
              {MOCK_CV_TARGET_ROLE_GROUPS.map((group) => (
                <optgroup
                  key={group.label}
                  label={group.label}
                  className="bg-elevated text-text-secondary"
                >
                  {group.roles.map((role) => (
                    <option
                      key={role.code}
                      value={role.code}
                      className="bg-elevated text-text-primary"
                    >
                      {role.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <ChevronDown
              size={17}
              aria-hidden="true"
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-violet-200/75 transition-transform group-focus-within:rotate-180"
            />
          </span>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block" htmlFor="mock-cv-total-questions">
            <span className="mb-2 block text-sm font-semibold text-text-primary">
              Số câu hỏi
            </span>
            <span className="group relative block">
              <FileQuestion
                size={17}
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-violet-200/75 transition-colors group-focus-within:text-violet-200"
              />
              <select
                id="mock-cv-total-questions"
                value={totalQuestions}
                onChange={(event) =>
                  setTotalQuestions(
                    Number(
                      event.target.value,
                    ) as (typeof MOCK_CV_QUESTION_OPTIONS)[number],
                  )
                }
                disabled={submitting}
                className="h-12 w-full cursor-pointer appearance-none rounded-2xl border border-white/12 bg-white/[0.06] pl-11 pr-11 text-sm font-semibold text-text-primary outline-none transition-all duration-300 hover:bg-white/[0.08] focus:border-violet-300/55 focus:bg-white/[0.085] focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {MOCK_CV_QUESTION_OPTIONS.map((value) => (
                  <option
                    key={value}
                    value={value}
                    className="bg-elevated text-text-primary"
                  >
                    {value} câu hỏi
                  </option>
                ))}
              </select>
              <ChevronDown
                size={17}
                aria-hidden="true"
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-violet-200/75 transition-transform group-focus-within:rotate-180"
              />
            </span>
          </label>

          <label className="block" htmlFor="mock-cv-duration">
            <span className="mb-2 block text-sm font-semibold text-text-primary">
              Thời lượng
            </span>
            <span className="group relative block">
              <Clock3
                size={17}
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-violet-200/75 transition-colors group-focus-within:text-violet-200"
              />
              <select
                id="mock-cv-duration"
                value={durationSeconds}
                onChange={(event) =>
                  setDurationSeconds(
                    Number(
                      event.target.value,
                    ) as (typeof MOCK_CV_DURATION_OPTIONS)[number]["value"],
                  )
                }
                disabled={submitting}
                className="h-12 w-full cursor-pointer appearance-none rounded-2xl border border-white/12 bg-white/[0.06] pl-11 pr-11 text-sm font-semibold text-text-primary outline-none transition-all duration-300 hover:bg-white/[0.08] focus:border-violet-300/55 focus:bg-white/[0.085] focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {MOCK_CV_DURATION_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    className="bg-elevated text-text-primary"
                  >
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={17}
                aria-hidden="true"
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-violet-200/75 transition-transform group-focus-within:rotate-180"
              />
            </span>
          </label>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-text-primary">
              File CV
            </span>
            <span className="text-xs font-medium text-white/45">
              PDF · tối đa 5 MB
            </span>
          </div>

          <div
            role="note"
            className="mb-3 flex items-start gap-2.5 rounded-lg border border-amber-300/30 bg-amber-400/10 px-3 py-2.5 text-amber-100"
          >
            <TriangleAlert
              size={17}
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-amber-300"
            />
            <p className="text-xs font-medium leading-5">
              PDF cần chứa văn bản có thể chọn hoặc sao chép, không sử dụng bản
              scan chỉ gồm hình ảnh.
            </p>
          </div>

          <div
            {...getRootProps()}
            className={[
              "group flex min-h-32 cursor-pointer items-center justify-center rounded-[1.25rem] border border-dashed px-4 py-4 text-center outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-violet-300/60",
              isDragActive
                ? "scale-[1.01] border-violet-200/70 bg-accent/18 shadow-[0_16px_38px_rgba(76,29,149,0.22)]"
                : file
                  ? "border-violet-300/40 bg-accent/12"
                  : "border-white/18 bg-white/[0.035] hover:-translate-y-0.5 hover:border-violet-300/45 hover:bg-white/[0.065]",
              submitting ? "pointer-events-none opacity-60" : "",
            ].join(" ")}
          >
            <input {...getInputProps()} />
            {file ? (
              <div className="flex w-full items-center gap-3 text-left">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-violet-300/25 bg-accent/18 text-[#c4b5fd] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                  <FileText size={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-success">
                    <FileCheck2 size={14} />
                    Sẵn sàng tải lên
                  </span>
                  <strong className="mt-1 block truncate text-sm font-bold text-text-primary">
                    {file.name}
                  </strong>
                  <span className="mt-1 block text-xs text-text-secondary">
                    {formatFileSize(file.size)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setFile(null);
                  }}
                  disabled={submitting}
                  aria-label="Bỏ file CV đã chọn"
                  className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 text-text-secondary transition-all duration-300 hover:border-danger/30 hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/50"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div>
                <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-violet-300/25 bg-accent/15 text-[#c4b5fd] shadow-[0_12px_30px_rgba(76,29,149,0.18),inset_0_1px_0_rgba(255,255,255,0.12)] transition-transform duration-300 group-hover:-translate-y-1">
                  <UploadCloud size={23} />
                </span>
                <p className="mt-3 text-sm font-bold text-text-primary">
                  {isDragActive
                    ? "Thả CV vào đây"
                    : "Kéo CV vào hoặc chọn từ máy"}
                </p>
                <p className="mt-1 text-xs leading-5 text-text-secondary">
                  Chúng tôi chỉ dùng CV để tạo câu hỏi luyện tập phù hợp.
                </p>
              </div>
            )}
          </div>

          {fileError && (
            <p className="mt-2 text-xs font-medium text-danger">{fileError}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.045] px-3 py-2.5">
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-violet-100">
            <Coins size={15} className="text-violet-300" />
            {creditCost === null
              ? "Đang tải chi phí phân tích"
              : `${formatNumber(creditCost)} AI credits cho ${totalQuestions} câu`}
          </span>
          {creditBalance && (
            <span
              className={`text-xs font-semibold ${
                hasEnoughCredits ? "text-white/55" : "text-danger"
              }`}
            >
              Hiện có {formatNumber(creditBalance.available)}
            </span>
          )}
        </div>

        {!hasEnoughCredits && (
          <p className="text-xs font-medium leading-5 text-danger">
            Bạn chưa đủ credits cho cấu hình này. Hãy chọn ít câu hơn hoặc{" "}
            <Link href="/pricing" className="underline underline-offset-2">
              xem gói phù hợp
            </Link>
            .
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="group flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3.5 text-sm font-black text-[#0f172a] shadow-[0_18px_48px_rgba(196,181,253,0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#ede9fe] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
        >
          <UploadCloud
            size={17}
            className="transition-transform duration-300 group-hover:-translate-y-0.5"
          />
          Tạo bài luyện theo CV
        </button>
      </form>

      {submitting && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/78 px-6 text-center backdrop-blur-sm">
          <span className="grid size-14 place-items-center rounded-full border border-white/15 bg-white/[0.08] text-violet-200 shadow-[0_18px_48px_rgba(2,6,23,0.42)]">
            <LoaderCircle size={27} className="animate-spin" />
          </span>
          <p className="mt-4 font-black text-white">Đang tải CV</p>
          <p className="mt-1 max-w-xs text-sm leading-6 text-white/60">
            Sau khi tải xong, bạn sẽ được chuyển sang màn hình chuẩn bị.
          </p>
        </div>
      )}
    </section>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, Loader2, UploadCloud, X } from "lucide-react";
import { useDropzone } from "react-dropzone";
import ModalPortal from "@/components/ui/ModalPortal";

const MAX_CV_SIZE = 5 * 1024 * 1024;

export default function MockCvUploadModal({
  open,
  submitting,
  onClose,
  onSubmit,
}: {
  open: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (input: { targetRole: string; cv: File }) => Promise<boolean>;
}) {
  const [targetRole, setTargetRole] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const onDrop = useCallback((files: File[]) => {
    setFile(files[0] ?? null);
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

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open, submitting]);

  if (!open) return null;

  const rejection = fileRejections[0]?.errors[0]?.code;
  const fileError =
    rejection === "file-too-large"
      ? "CV vượt quá dung lượng tối đa 5 MB."
      : rejection === "file-invalid-type"
        ? "Chỉ chấp nhận CV định dạng PDF."
        : rejection
          ? "File CV không hợp lệ."
          : null;
  const canSubmit = targetRole.trim().length >= 2 && !!file && !submitting;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !canSubmit) return;
    const succeeded = await onSubmit({ targetRole: targetRole.trim(), cv: file });
    if (!succeeded) return;
    setTargetRole("");
    setFile(null);
  }

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[110] grid place-items-center bg-black/65 p-4 backdrop-blur-sm"
        onMouseDown={() => !submitting && onClose()}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="mock-cv-upload-title"
          className="w-full max-w-lg overflow-hidden rounded-[1.5rem] border border-white/12 bg-[#0f172a]/92 shadow-[0_28px_90px_rgba(2,6,23,0.58),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-2xl"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6">
            <div>
              <h2
                id="mock-cv-upload-title"
                className="text-lg font-bold text-text-primary"
              >
                Thêm CV để luyện
              </h2>
              <p className="mt-1 text-sm leading-6 text-text-secondary">
                Chọn vị trí ứng tuyển để câu hỏi bám đúng mục tiêu của bạn.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              aria-label="Đóng hộp tải CV"
              className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-text-secondary transition-colors hover:bg-white/[0.1] hover:text-text-primary disabled:opacity-50"
            >
              <X size={17} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 p-5 sm:p-6">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-text-primary">
                Vị trí ứng tuyển
              </span>
              <input
                value={targetRole}
                onChange={(event) => setTargetRole(event.target.value)}
                maxLength={120}
                disabled={submitting}
                placeholder="Ví dụ: Backend Developer"
                className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.045] px-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent/60 disabled:opacity-60"
              />
            </label>

            <div>
              <p className="mb-2 text-sm font-semibold text-text-primary">
                File CV
              </p>
              <div
                {...getRootProps()}
                className={`flex min-h-36 cursor-pointer items-center justify-center rounded-xl border border-dashed px-4 py-5 text-center transition-all duration-200 ${
                  isDragActive
                    ? "border-accent-light/70 bg-accent/10"
                    : file
                      ? "border-accent-light/35 bg-accent/10"
                      : "border-white/15 bg-white/[0.025] hover:border-accent-light/40 hover:bg-white/[0.05]"
                }`}
              >
                <input {...getInputProps()} />
                {file ? (
                  <div className="flex w-full items-center gap-3 text-left">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-accent-light/25 bg-accent/15 text-accent-light">
                      <FileText size={21} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-sm font-semibold text-text-primary">
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
                      aria-label="Bỏ file CV đã chọn"
                      className="grid size-8 shrink-0 place-items-center rounded-full text-text-secondary transition-colors hover:bg-white/[0.08] hover:text-danger"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <UploadCloud
                      size={25}
                      className="mx-auto text-accent-light"
                    />
                    <p className="mt-2 text-sm font-semibold text-text-primary">
                      {isDragActive
                        ? "Thả CV vào đây"
                        : "Kéo thả hoặc chọn CV từ máy"}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      PDF, tối đa 5 MB
                    </p>
                  </div>
                )}
              </div>
              {fileError && (
                <p className="mt-2 text-xs text-danger">{fileError}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="h-10 rounded-lg border border-white/10 bg-white/[0.035] px-4 text-sm font-semibold text-text-secondary transition-colors hover:bg-white/[0.08] hover:text-text-primary disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-white transition-all hover:bg-accent-light active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <UploadCloud size={16} />
                )}
                Tải CV lên
              </button>
            </div>
          </form>
        </section>
      </div>
    </ModalPortal>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

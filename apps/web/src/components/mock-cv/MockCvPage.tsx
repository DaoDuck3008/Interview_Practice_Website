"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  ListFilter,
  Plus,
  RefreshCw,
  Search,
  UploadCloud,
  type LucideIcon,
} from "lucide-react";
import { toast } from "react-toastify";
import MockCvCard from "./MockCvCard";
import MockCvStartModal from "./MockCvStartModal";
import MockCvUploadModal from "./MockCvUploadModal";
import {
  createMockCv,
  deleteMockCv,
  getMockCvs,
  retryMockCvAnalysis,
  startMockCvInterview,
  type MockCv,
  type StartMockCvInterviewInput,
} from "@/lib/api/mockCvs";
import { toastApiError } from "@/lib/utils/apiError";
import { useStatusModal } from "@/components/ui/useStatusModal";
import TextType from "@/components/ui/TextType";

const PAGE_SIZE = 6;

export default function MockCvPage() {
  const router = useRouter();
  const { confirm, statusModal } = useStatusModal();
  const [cvs, setCvs] = useState<MockCv[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedCv, setSelectedCv] = useState<MockCv | null>(null);
  const [startingCvId, setStartingCvId] = useState<string | null>(null);
  const [retryingCvId, setRetryingCvId] = useState<string | null>(null);
  const [deletingCvId, setDeletingCvId] = useState<string | null>(null);

  const loadCvs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getMockCvs({ page: 1, limit: 50 });
      setCvs(data.items);
      setLoadError("");
    } catch (error) {
      if (!silent) {
        setLoadError(
          toastApiError(error, "Không thể tải danh sách CV. Vui lòng thử lại."),
        );
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void loadCvs());
  }, [loadCvs]);

  const needsPolling = cvs.some(
    (cv) =>
      cv.analysis?.status === "PENDING" ||
      cv.analysis?.status === "ANALYZING" ||
      cv.analysis?.questionGenerationStatus === "GENERATING" ||
      cv.latestInterview?.status === "SUBMITTED" ||
      cv.latestInterview?.status === "SCORING",
  );

  useEffect(() => {
    if (!needsPolling) return;
    const timer = window.setInterval(() => void loadCvs(true), 5000);
    return () => window.clearInterval(timer);
  }, [loadCvs, needsPolling]);

  const filteredCvs = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase("vi");
    const items = normalized
      ? cvs.filter(
          (cv) =>
            cv.targetRole.toLocaleLowerCase("vi").includes(normalized) ||
            cv.fileName.toLocaleLowerCase("vi").includes(normalized),
        )
      : [...cvs];

    return items.sort((first, second) => {
      const delta =
        new Date(second.updatedAt).getTime() -
        new Date(first.updatedAt).getTime();
      return sortOrder === "newest" ? delta : -delta;
    });
  }, [cvs, search, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredCvs.length / PAGE_SIZE));
  const visibleCvs = filteredCvs.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  useEffect(() => {
    if (page > totalPages) queueMicrotask(() => setPage(totalPages));
  }, [page, totalPages]);

  async function handleUpload(input: { targetRole: string; cv: File }) {
    setUploading(true);
    try {
      await createMockCv(input);
      setUploadOpen(false);
      toast.success("CV đã được tải lên và đang được chuẩn bị.");
      await loadCvs(true);
      return true;
    } catch (error) {
      toastApiError(error, "Không thể tải CV lên. Vui lòng thử lại.");
      return false;
    } finally {
      setUploading(false);
    }
  }

  async function handleStart(input: StartMockCvInterviewInput) {
    if (!selectedCv) return;
    setStartingCvId(selectedCv.id);
    try {
      const result = await startMockCvInterview(selectedCv.id, input);
      if (result.status === "PREPARING") {
        setSelectedCv(null);
        toast.info(
          "Hệ thống đang chuẩn bị bộ câu hỏi. Card sẽ tự cập nhật khi sẵn sàng.",
        );
        await loadCvs(true);
        return;
      }
      router.push(`/mock-cv/interviews/${result.interview.id}`);
    } catch (error) {
      toastApiError(error, "Không thể bắt đầu buổi luyện. Vui lòng thử lại.");
    } finally {
      setStartingCvId(null);
    }
  }

  async function handleRetry(cv: MockCv) {
    setRetryingCvId(cv.id);
    try {
      await retryMockCvAnalysis(cv.id);
      toast.success("Đã bắt đầu chuẩn bị lại CV.");
      await loadCvs(true);
    } catch (error) {
      toastApiError(error, "Không thể chuẩn bị lại CV. Vui lòng thử sau.");
    } finally {
      setRetryingCvId(null);
    }
  }

  async function handleDelete(cv: MockCv) {
    const accepted = await confirm({
      type: "alert",
      title: "Xóa CV này?",
      message: `CV cho vị trí ${cv.targetRole} và các buổi luyện liên quan sẽ bị xóa.`,
      confirmText: "Xóa CV",
      cancelText: "Giữ lại",
    });
    if (!accepted) return;

    setDeletingCvId(cv.id);
    try {
      await deleteMockCv(cv.id);
      toast.success("Đã xóa CV.");
      await loadCvs(true);
    } catch (error) {
      toastApiError(error, "Không thể xóa CV. Vui lòng thử lại.");
    } finally {
      setDeletingCvId(null);
    }
  }

  return (
    <main className="py-3 sm:py-5 md:py-8">
      <section className="relative min-h-52 overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0f172a] shadow-[0_22px_70px_rgba(2,6,23,0.38),inset_0_1px_0_rgba(255,255,255,0.12)] sm:min-h-60 md:rounded-[2rem]">
        <Image
          src="/images/mock-cv/add-cv-practice-cta-bg.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-top"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(76,29,149,0.88)_0%,rgba(124,58,237,0.46)_48%,rgba(139,92,246,0.08)_78%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_10%,rgba(139,92,246,0.28),transparent_38%)]" />

        <div className="relative flex min-h-52 max-w-2xl flex-col justify-center px-5 py-7 sm:min-h-60 sm:px-8 md:px-10">
          <p className="text-xs font-semibold text-accent-light">
            Luyện phỏng vấn theo CV
          </p>
          <TextType
            as="h1"
            text="Thêm CV để luyện đúng trọng tâm luôn"
            typingSpeed={54}
            initialDelay={180}
            startOnVisible
            loop={false}
            replayInterval={10000}
            cursorCharacter="_"
            className="mt-2 min-h-[2.4em] text-2xl font-extrabold tracking-tight text-text-primary sm:text-3xl md:text-4xl"
            cursorClassName="ml-1 text-accent-light"
          />
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#d8d6ea] sm:text-white">
            Hệ thống đọc kinh nghiệm và kỹ năng trong CV để chuẩn bị bộ câu hỏi
            sát với vị trí bạn đang ứng tuyển.
          </p>
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="mt-5 inline-flex h-11 w-fit items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(76,29,149,0.24),inset_0_1px_0_rgba(255,255,255,0.18)] transition-all hover:-translate-y-0.5 hover:bg-accent-light active:scale-[0.98]"
          >
            <Plus size={17} />
            Thêm CV để luyện
          </button>
        </div>
      </section>

      <section className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-3 shadow-[0_18px_65px_rgba(2,6,23,0.28),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl sm:mt-5 sm:p-4 md:rounded-[2rem] md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-text-primary sm:text-2xl">
              CV của bạn
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Mỗi CV là một bộ ngữ cảnh luyện tập riêng.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadCvs()}
              disabled={loading}
              aria-label="Làm mới danh sách CV"
              title="Làm mới"
              className="grid size-10 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-text-secondary transition-colors hover:bg-white/[0.08] hover:text-text-primary disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-3.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light active:scale-[0.98]"
            >
              <Plus size={16} />
              Thêm CV
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 focus-within:border-accent/60">
            <Search size={16} className="shrink-0 text-text-muted" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo tên CV hoặc vị trí ứng tuyển"
              className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
            />
          </label>
          <label className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-text-secondary focus-within:border-accent/60">
            <ListFilter size={16} />
            <select
              value={sortOrder}
              onChange={(event) => {
                setSortOrder(event.target.value as "newest" | "oldest");
                setPage(1);
              }}
              className="bg-transparent text-sm font-semibold text-text-primary outline-none"
            >
              <option value="newest" className="bg-elevated">
                Mới cập nhật
              </option>
              <option value="oldest" className="bg-elevated">
                Cũ nhất
              </option>
            </select>
          </label>
        </div>

        <div className="mt-4">
          {loading ? (
            <MockCvSkeleton />
          ) : loadError ? (
            <EmptyState
              icon={RefreshCw}
              title="Chưa tải được danh sách CV"
              description={loadError}
              actionLabel="Thử lại"
              onAction={() => void loadCvs()}
            />
          ) : visibleCvs.length === 0 ? (
            <EmptyState
              icon={search ? Search : FileText}
              title={search ? "Không tìm thấy CV phù hợp" : "Chưa có CV nào"}
              description={
                search
                  ? "Thử tìm bằng tên file hoặc vị trí ứng tuyển khác."
                  : "Tải CV đầu tiên để bắt đầu luyện phỏng vấn theo kinh nghiệm của bạn."
              }
              actionLabel={search ? undefined : "Thêm CV"}
              onAction={search ? undefined : () => setUploadOpen(true)}
            />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {visibleCvs.map((cv) => (
                <MockCvCard
                  key={cv.id}
                  cv={cv}
                  busy={
                    startingCvId === cv.id ||
                    retryingCvId === cv.id ||
                    deletingCvId === cv.id
                  }
                  onStart={setSelectedCv}
                  onRetry={(item) => void handleRetry(item)}
                  onDelete={(item) => void handleDelete(item)}
                  onReplace={() => setUploadOpen(true)}
                />
              ))}
            </div>
          )}
        </div>

        {totalPages > 1 && !loading && (
          <nav
            aria-label="Phân trang danh sách CV"
            className="mt-5 flex items-center justify-between border-t border-white/[0.07] pt-4"
          >
            <p className="text-xs text-text-muted">
              Trang {page}/{totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={page === 1}
                aria-label="Trang trước"
                className="grid size-9 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-text-secondary transition-colors hover:bg-white/[0.08] hover:text-text-primary disabled:opacity-35"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() =>
                  setPage((value) => Math.min(totalPages, value + 1))
                }
                disabled={page === totalPages}
                aria-label="Trang sau"
                className="grid size-9 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-text-secondary transition-colors hover:bg-white/[0.08] hover:text-text-primary disabled:opacity-35"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </nav>
        )}
      </section>

      <MockCvUploadModal
        open={uploadOpen}
        submitting={uploading}
        onClose={() => setUploadOpen(false)}
        onSubmit={handleUpload}
      />
      <MockCvStartModal
        key={selectedCv?.id ?? "closed"}
        cv={selectedCv}
        submitting={startingCvId === selectedCv?.id}
        onClose={() => setSelectedCv(null)}
        onSubmit={handleStart}
      />
      {statusModal}
    </main>
  );
}

function MockCvSkeleton() {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-60 rounded-[1.25rem] border border-white/10 bg-white/[0.04] skeleton-pulse"
        />
      ))}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-[1.25rem] border border-dashed border-white/12 bg-white/[0.025] px-6 text-center">
      <span className="grid size-11 place-items-center rounded-full border border-accent-light/20 bg-accent/10 text-accent-light">
        <Icon size={20} />
      </span>
      <h3 className="mt-3 text-base font-semibold text-text-primary">
        {title}
      </h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-text-secondary">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-light"
        >
          <UploadCloud size={16} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

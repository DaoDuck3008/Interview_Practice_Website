"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FileSearch2,
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
import MockCvHeroUploadCard from "./MockCvHeroUploadCard";
import {
  createMockCv,
  deleteMockCv,
  getMockCvs,
  retryMockCvAnalysis,
  type CreateMockCvInput,
  type MockCv,
} from "@/lib/api/mockCvs";
import { toastApiError } from "@/lib/utils/apiError";
import { useStatusModal } from "@/components/ui/useStatusModal";
import TextType from "@/components/ui/TextType";
import { useSocket } from "@/hooks/useSocket";
import {
  getAiCreditBalance,
  getAiCreditPricing,
  type AiCreditBalance,
  type AiCreditPricing,
} from "@/lib/api/aiCredits";

const PAGE_SIZE = 6;

export default function MockCvPage() {
  const router = useRouter();
  const socket = useSocket();
  const { confirm, statusModal } = useStatusModal();
  const [cvs, setCvs] = useState<MockCv[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [retryingCvId, setRetryingCvId] = useState<string | null>(null);
  const [deletingCvId, setDeletingCvId] = useState<string | null>(null);
  const [creditBalance, setCreditBalance] = useState<AiCreditBalance | null>(
    null,
  );
  const [creditPricing, setCreditPricing] = useState<AiCreditPricing | null>(
    null,
  );
  const uploadLockRef = useRef(false);
  const loadRequestIdRef = useRef(0);
  const latestSearchRef = useRef("");

  const scrollToUploadForm = useCallback(() => {
    const uploadCard = document.getElementById("mock-cv-upload-card");
    const targetRoleInput = document.getElementById(
      "mock-cv-target-role",
    ) as HTMLSelectElement | null;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    uploadCard?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "center",
    });
    window.requestAnimationFrame(() => {
      targetRoleInput?.focus({ preventScroll: true });
    });
  }, []);

  const loadCvs = useCallback(
    async (silent = false) => {
      const requestId = ++loadRequestIdRef.current;
      if (!silent) setLoading(true);
      try {
        const data = await getMockCvs({
          page,
          limit: PAGE_SIZE,
          search: debouncedSearch || undefined,
          sortOrder,
        });
        if (requestId !== loadRequestIdRef.current) return;

        setCvs(data.items);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        setLoadError("");
        if (data.page > data.totalPages) setPage(data.totalPages);
      } catch (error) {
        if (requestId !== loadRequestIdRef.current) return;
        if (!silent) {
          setLoadError(
            toastApiError(
              error,
              "Không thể tải danh sách CV. Vui lòng thử lại.",
            ),
          );
        }
      } finally {
        if (requestId === loadRequestIdRef.current) {
          setLoading(false);
          if (debouncedSearch === latestSearchRef.current.trim()) {
            setSearching(false);
          }
        }
      }
    },
    [debouncedSearch, page, sortOrder],
  );

  const loadCreditInfo = useCallback(async () => {
    const [balanceResult, pricingResult] = await Promise.allSettled([
      getAiCreditBalance(),
      getAiCreditPricing(),
    ]);
    if (balanceResult.status === "fulfilled") {
      setCreditBalance(balanceResult.value);
    }
    if (pricingResult.status === "fulfilled") {
      setCreditPricing(pricingResult.value);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void loadCvs());
  }, [loadCvs]);

  useEffect(() => {
    queueMicrotask(() => void loadCreditInfo());
  }, [loadCreditInfo]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const normalizedSearch = search.trim();
      if (normalizedSearch === debouncedSearch) {
        setSearching(false);
        return;
      }
      setPage(1);
      setDebouncedSearch(normalizedSearch);
    }, 600);
    return () => window.clearTimeout(timeoutId);
  }, [debouncedSearch, search]);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => {
      void loadCvs(true);
      void loadCreditInfo();
    };
    socket.on("mock-cv:analysis-updated", refresh);
    socket.on("mock-cv:questions-updated", refresh);
    socket.on("mock-cv-interview:scored", refresh);
    socket.on("mock-cv-interview:failed", refresh);
    socket.on("connect", refresh);
    return () => {
      socket.off("mock-cv:analysis-updated", refresh);
      socket.off("mock-cv:questions-updated", refresh);
      socket.off("mock-cv-interview:scored", refresh);
      socket.off("mock-cv-interview:failed", refresh);
      socket.off("connect", refresh);
    };
  }, [loadCreditInfo, loadCvs, socket]);

  const shouldShowPagination = total > PAGE_SIZE;

  async function handleUpload(input: CreateMockCvInput) {
    if (uploadLockRef.current) return false;
    uploadLockRef.current = true;
    setUploading(true);
    try {
      const created = await createMockCv(input);
      router.push(`/mock-cv/processing/${created.id}`);
      return true;
    } catch (error) {
      toastApiError(error, "Không thể tải CV lên. Vui lòng thử lại.");
      return false;
    } finally {
      uploadLockRef.current = false;
      setUploading(false);
    }
  }

  async function handleRetry(cv: MockCv) {
    setRetryingCvId(cv.id);
    try {
      await retryMockCvAnalysis(cv.id);
      toast.success("Đã bắt đầu chuẩn bị lại CV.");
      await Promise.all([loadCvs(true), loadCreditInfo()]);
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
    <main className="performance-page mx-2 py-3 text-white sm:mx-3 sm:py-5 md:py-8">
      <section
        className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0f172a] shadow-[0_24px_90px_rgba(0,0,0,0.42)]"
        style={{ minHeight: "clamp(650px, 82vh, 860px)" }}
      >
        <Image
          src="/images/mock-cv/mock-cv-hero-bg-v2.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.08)_0%,rgba(15,23,42,0.18)_42%,rgba(15,23,42,0.5)_70%,rgba(15,23,42,0.68)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_16%,rgba(196,181,253,0.16),transparent_34%)]" />

        <div className="relative grid min-h-[inherit] gap-5 p-4 sm:p-5 md:gap-8 md:p-8 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-center lg:p-10">
          <div className="flex min-h-[300px] flex-col justify-between sm:min-h-[380px] lg:min-h-[620px]">
            <div className="max-w-2xl animate-[fadeIn_700ms_ease-out_both]">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ddd6fe] shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-xl sm:mb-5 sm:px-3.5 sm:py-2 sm:text-xs">
                <FileSearch2 size={14} />
                Mock CV
              </div>
              <div
                className="max-w-xl"
                style={{
                  WebkitMaskImage:
                    "linear-gradient(90deg, transparent 0%, black 7%, black 93%, transparent 100%)",
                  maskImage:
                    "linear-gradient(90deg, transparent 0%, black 7%, black 93%, transparent 100%)",
                }}
              >
                <TextType
                  as="h1"
                  text="Luyện đúng những gì nhà tuyển dụng sẽ hỏi từ CV."
                  typingSpeed={54}
                  initialDelay={220}
                  startOnVisible
                  loop={false}
                  replayInterval={10000}
                  cursorCharacter="_"
                  className="min-h-[calc(3*1em)] bg-[linear-gradient(105deg,#ffffff_0%,#ddd6fe_24%,#a78bfa_56%,#c4b5fd_78%,#f5f3ff_100%)] bg-clip-text text-3xl font-black leading-tight tracking-tight text-transparent drop-shadow-[0_0_26px_rgba(124,58,237,0.28)] sm:text-4xl md:text-5xl lg:text-6xl"
                  cursorClassName="ml-1 text-[#c4b5fd]"
                />
                <p className="mt-4 max-w-lg text-sm leading-6 text-[#d8d6ea] sm:mt-5 sm:text-white sm:leading-7 md:text-lg">
                  Tải CV và chọn vị trí ứng tuyển. Hệ thống sẽ đọc kinh nghiệm,
                  kỹ năng và dự án để chuẩn bị bộ câu hỏi sát với hồ sơ của bạn.
                </p>
              </div>
            </div>
          </div>

          <MockCvHeroUploadCard
            submitting={uploading}
            onSubmit={handleUpload}
            creditBalance={creditBalance}
            creditPricing={creditPricing}
          />
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
              disabled={loading || searching}
              aria-label="Làm mới danh sách CV"
              title="Làm mới"
              className="grid size-10 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-text-secondary transition-colors hover:bg-white/[0.08] hover:text-text-primary disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loading || searching ? "animate-spin" : ""}
              />
            </button>
            <button
              type="button"
              onClick={scrollToUploadForm}
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
                latestSearchRef.current = event.target.value;
                setSearch(event.target.value);
                setSearching(true);
              }}
              aria-busy={searching}
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
          {loading || searching ? (
            <MockCvSkeleton searching={searching} />
          ) : loadError ? (
            <EmptyState
              icon={RefreshCw}
              title="Chưa tải được danh sách CV"
              description={loadError}
              actionLabel="Thử lại"
              onAction={() => void loadCvs()}
            />
          ) : cvs.length === 0 ? (
            <EmptyState
              icon={search ? Search : FileText}
              title={search ? "Không tìm thấy CV phù hợp" : "Chưa có CV nào"}
              description={
                search
                  ? "Thử tìm bằng tên file hoặc vị trí ứng tuyển khác."
                  : "Tải CV đầu tiên để bắt đầu luyện phỏng vấn theo kinh nghiệm của bạn."
              }
              actionLabel={search ? undefined : "Thêm CV"}
              onAction={search ? undefined : scrollToUploadForm}
            />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {cvs.map((cv) => (
                <MockCvCard
                  key={cv.id}
                  cv={cv}
                  busy={retryingCvId === cv.id || deletingCvId === cv.id}
                  onStart={(item) =>
                    router.push(`/mock-cv/processing/${item.id}`)
                  }
                  onRetry={(item) => void handleRetry(item)}
                  onDelete={(item) => void handleDelete(item)}
                  onReplace={scrollToUploadForm}
                />
              ))}
            </div>
          )}
        </div>

        {shouldShowPagination && !loading && !searching && (
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

      {statusModal}
    </main>
  );
}

function MockCvSkeleton({ searching = false }: { searching?: boolean }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2" role="status" aria-live="polite">
      <span className="sr-only">
        {searching ? "Đang tìm CV phù hợp" : "Đang tải danh sách CV"}
      </span>
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className={`relative w-full max-w-[42rem] justify-self-start overflow-hidden rounded-[1.25rem] border border-white/10 bg-surface/70 p-4 shadow-[0_20px_55px_rgba(2,6,23,0.22)] sm:p-5 ${
            searching
              ? "blur-[1px] motion-safe:animate-pulse"
              : "skeleton-pulse"
          }`}
          style={{ animationDelay: `${index * 90}ms` }}
        >
          <div className="flex items-center gap-3">
            <div className="size-13 shrink-0 rounded-xl bg-white/[0.08] sm:size-14" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-2/5 rounded-md bg-white/[0.09]" />
              <div className="h-3 w-3/5 rounded-md bg-white/[0.06]" />
            </div>
            <div className="size-8 rounded-full bg-white/[0.05]" />
          </div>

          <div className="mt-3 flex gap-2">
            <div className="h-7 w-24 rounded-full bg-accent/10" />
            <div className="h-7 w-28 rounded-full bg-accent/10" />
            <div className="h-7 w-16 rounded-full bg-accent/10" />
          </div>

          <div className="mt-3 flex items-end justify-between gap-3 border-t border-white/[0.07] pt-3">
            <div className="flex flex-1 items-center gap-2.5">
              <div className="size-8 shrink-0 rounded-lg bg-white/[0.07]" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-36 rounded-md bg-white/[0.08]" />
                <div className="h-2.5 w-24 rounded-md bg-white/[0.05]" />
                <div className="h-2.5 w-28 rounded-md bg-white/[0.05]" />
              </div>
            </div>
            <div className="h-9 w-28 rounded-lg bg-white/[0.07]" />
          </div>
        </div>
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
      <h3 className="mt-3 font-semibold text-white">{title}</h3>
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

"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles, X } from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  createExplanation,
  getExplanationStatus,
  type ExplanationResponse,
  type ExplanationSource,
  type TechnicalExplanation,
} from "@/lib/api/explanations";
import { useAuthStore } from "@/stores/auth.store";
import { useSocket } from "@/hooks/useSocket";

interface Props {
  questionId: string;
  source: ExplanationSource;
  children: React.ReactNode;
  className?: string;
  as?: "span" | "div";
}
interface SelectionPosition {
  left: number;
  top: number;
}
const valid = (value: string) =>
  value.length >= 2 &&
  value.length <= 60 &&
  !/[\r\n]/.test(value) &&
  value.split(/\s+/).length <= 6;

export default function TermExplainer({
  questionId,
  source,
  children,
  className,
  as: Element = "span",
}: Props) {
  const ref = useRef<HTMLElement>(null);
  const [selected, setSelected] = useState("");
  const [position, setPosition] = useState<SelectionPosition | null>(null);
  const [result, setResult] = useState<TechnicalExplanation | null>(null);
  const [pendingTermId, setPendingTermId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const socket = useSocket();

  /** Socket đưa kết quả ngay; polling backoff bảo toàn trải nghiệm khi event bị lỡ. */
  useEffect(() => {
    if (!pendingTermId) return;
    let cancelled = false;
    const finish = (data: ExplanationResponse) => {
      if (cancelled) return;
      if ("canonicalTerm" in data) {
        setResult(data);
        setPendingTermId(null);
      } else if (data.status === "FAILED") {
        toast.error("Không thể tạo giải thích. Vui lòng thử lại sau.");
        setPendingTermId(null);
      }
    };
    const onReady = (data: TechnicalExplanation & { termId: string }) => {
      if (data.termId === pendingTermId) finish(data);
    };
    const onFailed = (data: { termId: string; message?: string }) => {
      if (data.termId === pendingTermId) {
        toast.error(data.message ?? "Không thể tạo giải thích.");
        setPendingTermId(null);
      }
    };
    socket?.on("explanation:ready", onReady);
    socket?.on("explanation:failed", onFailed);
    const delays = [2000, 3000, 5000, 5000, 5000];
    let timer: ReturnType<typeof setTimeout>;
    const poll = (index: number) => {
      timer = setTimeout(async () => {
        try {
          finish(await getExplanationStatus(pendingTermId));
        } catch {
          /* Socket hoặc lần poll sau sẽ thử lại. */
        }
        if (!cancelled && index < delays.length - 1) poll(index + 1);
      }, delays[index]);
    };
    poll(0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      socket?.off("explanation:ready", onReady);
      socket?.off("explanation:failed", onFailed);
    };
  }, [pendingTermId, socket]);

  /** Chỉ nhận selection nằm hoàn toàn trong đúng vùng nội dung được cho phép. */
  function captureSelection() {
    const selection = window.getSelection();
    const text = selection?.toString().replace(/\s+/g, " ").trim() ?? "";
    const anchor = selection?.anchorNode;
    const focus = selection?.focusNode;
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    if (
      !anchor ||
      !focus ||
      !range ||
      !ref.current?.contains(anchor) ||
      !ref.current?.contains(focus) ||
      !valid(text)
    ) {
      setSelected("");
      setResult(null);
      setPosition(null);
      return;
    }
    // Một Range nhiều dòng có bounding box rất lớn; rect đầu tiên mới đúng vị trí bắt đầu selection.
    const rect =
      Array.from(range.getClientRects())[0] ?? range.getBoundingClientRect();
    // Giữ action nằm trong viewport khi selection ở sát hai cạnh màn hình.
    setPosition({
      left: Math.min(
        Math.max(rect.left + rect.width / 2, 72),
        window.innerWidth - 72,
      ),
      top: Math.max(rect.top, 36),
    });
    setResult(null);
    setPendingTermId(null);
    setSelected(text);
  }
  /** Frontend chỉ gửi selection; server vẫn là nơi xác thực lại text với dữ liệu Question. */
  async function explain() {
    if (!hydrated || !user) {
      toast.warning("Vui lòng đăng nhập để giải thích thuật ngữ.");
      return;
    }
    setLoading(true);
    try {
      const response = await createExplanation({
        questionId,
        source,
        selectedText: selected,
      });
      if ("canonicalTerm" in response) setResult(response);
      else setPendingTermId(response.termId);
    } catch (err) {
      setSelected("");
      toast.error(
        axios.isAxiosError(err)
          ? (err.response?.data?.message ?? "Không thể tạo giải thích.")
          : "Không thể tạo giải thích.",
      );
    } finally {
      setLoading(false);
    }
  }
  function dismiss() {
    setSelected("");
    setResult(null);
    setPendingTermId(null);
    setPosition(null);
  }

  const overlay =
    selected && position ? (
      <span
        className="fixed z-50 block -translate-x-1/2 -translate-y-[calc(100%+0.375rem)]"
        style={{ left: position.left, top: position.top }}
        role="dialog"
        aria-label="Giải thích thuật ngữ"
      >
        {!result ? (
          <button
            type="button"
            onMouseUp={(event) => event.stopPropagation()}
            onClick={explain}
            disabled={loading || Boolean(pendingTermId)}
            className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-surface/95 px-2 py-1 text-xs font-medium text-text-secondary shadow-lg backdrop-blur transition-colors hover:text-text-primary disabled:cursor-wait disabled:opacity-60"
          >
            <Sparkles size={12} strokeWidth={1.8} />
            {loading || pendingTermId ? "Đang tạo…" : "Giải thích"}
          </button>
        ) : (
          <span className="block w-[min(23rem,calc(100vw-2rem))] rounded-lg border border-border bg-elevated p-3 shadow-2xl">
            <span className="flex items-start justify-between gap-3">
              <p className="text-sm font-bold text-text-primary">
                {result.canonicalTerm}
              </p>
              <button
                type="button"
                onMouseUp={(event) => event.stopPropagation()}
                onClick={dismiss}
                className="cursor-pointer text-text-muted transition-colors hover:text-text-primary"
                aria-label="Đóng"
              >
                <X size={15} />
              </button>
            </span>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              {result.explanation}
            </p>
            <p className="mt-2 text-[11px] text-text-muted">
              {result.cached ? "Từ glossary" : "Vừa được AI tạo"}
            </p>
          </span>
        )}
      </span>
    ) : null;

  return (
    <Element
      ref={ref as never}
      className={className}
      onMouseUp={captureSelection}
      onKeyUp={captureSelection}
    >
      {children}
      {typeof document !== "undefined" && overlay
        ? createPortal(overlay, document.body)
        : null}
    </Element>
  );
}

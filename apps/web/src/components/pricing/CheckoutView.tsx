"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  CircleCheckBig,
  Clock,
  Copy,
  Loader2,
  XCircle,
} from "lucide-react";
import { getOrder, type CheckoutOrder } from "@/lib/api/payments";
import { formatVnd } from "@/lib/utils/format";

const panel =
  "rounded-2xl border border-white/10 backdrop-blur-xl p-6 md:p-8";
const panelBg = { background: "rgba(255,255,255,0.05)" } as const;

function CopyRow({
  label,
  value,
  copyText,
}: {
  label: string;
  value: string;
  copyText?: string;
}) {
  function copy() {
    navigator.clipboard.writeText(copyText ?? value);
    toast.success(`Đã sao chép ${label.toLowerCase()}`);
  }
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-white/10 last:border-0">
      <span className="text-sm text-[var(--color-text-muted)]">{label}</span>
      <button
        type="button"
        onClick={copy}
        className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent-light)] transition-colors cursor-pointer text-right"
      >
        <span className="truncate max-w-[180px]">{value}</span>
        <Copy size={13} className="flex-shrink-0 opacity-60" />
      </button>
    </div>
  );
}

export default function CheckoutView({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<CheckoutOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const paidNotified = useRef(false);

  // Poll trạng thái đơn — chỉ khi đơn còn PENDING và chưa hết hạn.
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setInterval> | undefined;

    const stopPolling = () => {
      if (timer) {
        clearInterval(timer);
        timer = undefined;
      }
    };

    async function load(): Promise<boolean> {
      try {
        const o = await getOrder(orderId);
        if (!active) return true;
        setOrder(o);
        setLoading(false);
        if (o.status === "PAID" && !paidNotified.current) {
          paidNotified.current = true;
          toast.success("Thanh toán thành công!");
        }
        // Dừng khi đơn đã chốt trạng thái HOẶC QR đã hết hạn.
        const done =
          o.status !== "PENDING" ||
          new Date(o.expiresAt).getTime() <= Date.now();
        if (done) stopPolling();
        return done;
      } catch {
        if (!active) return true;
        setNotFound(true);
        setLoading(false);
        stopPolling();
        return true;
      }
    }

    // Fetch ngay lần đầu; chỉ bật interval nếu còn cần chờ (fix poll dư 1 lần).
    load().then((done) => {
      if (active && !done) timer = setInterval(load, 4000);
    });

    return () => {
      active = false;
      stopPolling();
    };
  }, [orderId]);

  // Đồng hồ đếm ngược.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-[var(--color-text-secondary)]">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className={panel} style={panelBg}>
        <p className="text-center text-[var(--color-text-secondary)]">
          Không tìm thấy đơn hàng.
        </p>
        <div className="mt-6 text-center">
          <Link
            href="/pricing"
            className="text-sm text-[var(--color-accent-light)] hover:underline"
          >
            ← Về bảng giá
          </Link>
        </div>
      </div>
    );
  }

  // Thành công
  if (order.status === "PAID") {
    return (
      <div className={`${panel} text-center py-12`} style={panelBg}>
        <CircleCheckBig
          size={96}
          strokeWidth={1.75}
          className="mx-auto text-[var(--color-success)]"
        />
        <h1 className="mt-6 text-2xl font-bold text-[var(--color-text-primary)]">
          Thanh toán thành công
        </h1>
        <p className="mt-2 text-[var(--color-text-secondary)]">
          Gói <span className="font-semibold">{order.plan.name}</span> đã được
          kích hoạt. Chúc bạn luyện tập hiệu quả!
        </p>
        <Link
          href="/practice"
          className="mt-8 inline-block rounded-md bg-[var(--color-accent)] hover:bg-[var(--color-accent-light)] text-white px-6 py-3 text-sm font-semibold transition-colors"
        >
          Bắt đầu luyện tập
        </Link>
      </div>
    );
  }

  // Thất bại / huỷ
  if (order.status === "FAILED" || order.status === "CANCELED") {
    return (
      <div className={`${panel} text-center`} style={panelBg}>
        <XCircle size={56} className="mx-auto text-red-400" />
        <h1 className="mt-4 text-2xl font-bold text-[var(--color-text-primary)]">
          Thanh toán không thành công
        </h1>
        <p className="mt-2 text-[var(--color-text-secondary)]">
          Đơn hàng đã bị huỷ hoặc số tiền không khớp. Vui lòng tạo đơn mới.
        </p>
        <Link
          href="/pricing"
          className="mt-6 inline-block rounded-md border border-white/15 px-6 py-3 text-sm font-semibold text-[var(--color-text-primary)] hover:border-[var(--color-accent)] transition-colors"
        >
          Về bảng giá
        </Link>
      </div>
    );
  }

  // PENDING — hiển thị QR + hướng dẫn
  const remainingMs = new Date(order.expiresAt).getTime() - now;
  const expired = remainingMs <= 0;
  const mm = Math.max(0, Math.floor(remainingMs / 60000));
  const ss = Math.max(0, Math.floor((remainingMs % 60000) / 1000));
  const amountStr = formatVnd(order.amountVnd);

  return (
    <div>
      <Link
        href="/pricing"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors mb-5"
      >
        <ArrowLeft size={15} />
        Bảng giá
      </Link>

      <div className={panel} style={panelBg}>
        <div className="text-center mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-[var(--color-text-primary)]">
            Thanh toán gói {order.plan.name}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Quét mã QR bằng app ngân hàng — số tiền và nội dung đã được điền sẵn.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 items-start">
          {/* QR */}
          <div className="flex flex-col items-center">
            <div className="bg-white rounded-xl p-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={order.qrUrl}
                alt="Mã QR thanh toán"
                className="w-[180px] h-[180px] object-contain"
              />
            </div>
            <div
              className={`mt-3 inline-flex items-center gap-1.5 text-sm ${
                expired
                  ? "text-amber-400"
                  : "text-[var(--color-text-secondary)]"
              }`}
            >
              <Clock size={14} />
              {expired ? (
                <span>Mã QR đã hết hạn</span>
              ) : (
                <span>
                  Hết hạn sau {mm}:{ss.toString().padStart(2, "0")}
                </span>
              )}
            </div>
          </div>

          {/* Thông tin chuyển khoản */}
          <div>
            <CopyRow label="Ngân hàng" value={order.bankCode} />
            <CopyRow label="Số tài khoản" value={order.bankAccount} />
            <CopyRow label="Chủ tài khoản" value={order.accountName} />
            <CopyRow
              label="Số tiền"
              value={amountStr}
              copyText={String(order.amountVnd)}
            />
            <CopyRow label="Nội dung" value={order.transferCode} />

            <div className="mt-5 rounded-lg border border-white/10 bg-white/5 p-3">
              {expired ? (
                <Link
                  href="/pricing"
                  className="block text-center rounded-md bg-[var(--color-accent)] hover:bg-[var(--color-accent-light)] text-white py-2.5 text-sm font-semibold transition-colors"
                >
                  Tạo đơn mới
                </Link>
              ) : (
                <p className="flex items-center justify-center gap-2 text-sm text-[var(--color-text-secondary)]">
                  <Loader2 size={15} className="animate-spin" />
                  Đang chờ thanh toán… trang sẽ tự cập nhật.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Loader2,
  Search,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  reconcile,
  getReconcileConfig,
  type ReconcileResult,
  type ReconcileTxn,
  type ReconcileMatched,
  type ReconcileMismatch,
} from "@/lib/api/payments";
import { formatVnd } from "@/lib/utils/format";
import { ORDER_STATUS_META } from "@/lib/utils/subscriptions";

const controlStyle = { background: "#0d0d14", border: "1px solid #1c1c28" };
const dateClass =
  "px-3 py-2 rounded-lg text-sm text-[#f4f4f6] outline-none cursor-pointer [color-scheme:dark]";

/** Mặc định: 7 ngày gần nhất. */
function defaultRange(): { from: string; to: string } {
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { from: iso(weekAgo), to: iso(today) };
}

export default function ReconcileView() {
  const init = defaultRange();
  const [from, setFrom] = useState(init.from);
  const [to, setTo] = useState(init.to);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReconcileResult | null>(null);

  useEffect(() => {
    getReconcileConfig()
      .then((c) => setConfigured(c.configured))
      .catch(() => setConfigured(false));
  }, []);

  async function run() {
    if (!from || !to) {
      toast.error("Chọn khoảng ngày để đối soát.");
      return;
    }
    setLoading(true);
    try {
      setResult(await reconcile(from, to));
    } catch {
      toast.error("Không đối soát được — kiểm tra Sepay API hoặc thử lại.");
    } finally {
      setLoading(false);
    }
  }

  if (configured === false) {
    return (
      <div
        className="rounded-2xl border border-[#1c1c28] bg-[#0d0d14] p-8 text-center"
        style={controlStyle}
      >
        <p className="text-sm text-[#9898aa]">
          Chưa cấu hình Sepay API. Đặt biến môi trường{" "}
          <span className="font-mono text-[#f4f4f6]">SEPAY_API_KEY</span> ở backend
          để bật tính năng đối soát.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-[#606072]">Ngày giao dịch:</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={dateClass}
            style={controlStyle}
            aria-label="Từ ngày"
          />
          <span className="text-[#606072]">–</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className={dateClass}
            style={controlStyle}
            aria-label="Đến ngày"
          />
        </div>
        <button
          onClick={run}
          disabled={loading || configured === null}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors duration-200 cursor-pointer disabled:opacity-50"
          style={{
            background: "#7c3aed",
            boxShadow: "0 0 14px rgba(124,58,237,0.3)",
          }}
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Search size={16} />
          )}
          Đối soát
        </button>
      </div>

      {!result ? (
        <p className="text-sm text-[#606072]">
          Chọn khoảng ngày và bấm <span className="text-[#9898aa]">Đối soát</span>{" "}
          để so khớp giao dịch ngân hàng (Sepay) với đơn hàng.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard
              label="Khớp"
              value={result.summary.matched}
              color="#22c55e"
            />
            <SummaryCard
              label="Lệch"
              value={result.summary.mismatch}
              color="#f59e0b"
            />
            <SummaryCard
              label="Mồ côi"
              value={result.summary.orphan}
              color="#ef4444"
            />
            <SummaryCard
              label={`Tổng tiền vào (${result.summary.total} GD)`}
              value={formatVnd(result.summary.totalAmountIn)}
              color="#8b5cf6"
            />
          </div>

          <Section
            icon={<CheckCircle2 size={16} className="text-[#22c55e]" />}
            title={`Khớp (${result.matched.length})`}
            empty="Không có giao dịch khớp."
            rows={result.matched}
            render={(m: ReconcileMatched) => (
              <MatchedRow key={m.txnId} m={m} />
            )}
          />
          <Section
            icon={<AlertTriangle size={16} className="text-[#f59e0b]" />}
            title={`Lệch (${result.mismatch.length})`}
            empty="Không có giao dịch lệch."
            rows={result.mismatch}
            render={(m: ReconcileMismatch) => (
              <MismatchRow key={m.txnId} m={m} />
            )}
          />
          <Section
            icon={<HelpCircle size={16} className="text-[#ef4444]" />}
            title={`Mồ côi — tiền về không khớp đơn (${result.orphan.length})`}
            empty="Không có giao dịch mồ côi."
            rows={result.orphan}
            render={(t: ReconcileTxn) => <OrphanRow key={t.txnId} t={t} />}
          />
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-[#1c1c28] bg-[#0d0d14] px-4 py-3">
      <p className="text-xs text-[#606072] mb-1">{label}</p>
      <p className="text-xl font-bold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

function Section<T>({
  icon,
  title,
  empty,
  rows,
  render,
}: {
  icon: ReactNode;
  title: string;
  empty: string;
  rows: T[];
  render: (row: T) => ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h3 className="text-sm font-semibold text-[#f4f4f6]">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-[#606072] pl-6">{empty}</p>
      ) : (
        <div className="flex flex-col gap-2">{rows.map(render)}</div>
      )}
    </div>
  );
}

const rowClass =
  "rounded-lg border border-[#1c1c28] bg-[#0d0d14] px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1";

function TxnMeta({ t }: { t: ReconcileTxn }) {
  return (
    <>
      <span className="text-sm font-semibold text-[#f4f4f6]">
        {formatVnd(t.amountIn)}
      </span>
      <span className="text-xs text-[#9898aa]">{t.date}</span>
      {t.code && (
        <span className="text-xs font-mono text-[#9898aa]">{t.code}</span>
      )}
      {t.bankBrand && (
        <span className="text-xs text-[#606072]">{t.bankBrand}</span>
      )}
    </>
  );
}

function MatchedRow({ m }: { m: ReconcileMatched }) {
  return (
    <div className={rowClass}>
      <TxnMeta t={m} />
      <span className="text-xs text-[#606072] ml-auto">
        {m.order.user.name} · {m.order.plan.name}
      </span>
    </div>
  );
}

function MismatchRow({ m }: { m: ReconcileMismatch }) {
  const meta = ORDER_STATUS_META[m.order.status];
  return (
    <div className={`${rowClass} border-[#f59e0b]/40`}>
      <TxnMeta t={m} />
      <span
        className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
        style={{
          background: `${meta.color}1a`,
          color: meta.color,
          border: `1px solid ${meta.color}4d`,
        }}
      >
        {meta.label}
      </span>
      <span className="text-xs text-[#f59e0b] w-full md:w-auto md:ml-auto">
        {m.reason}
      </span>
      <span className="text-xs text-[#606072] w-full">
        {m.order.user.name} · {m.order.user.email} · cần{" "}
        {formatVnd(m.order.amountVnd)}
      </span>
    </div>
  );
}

function OrphanRow({ t }: { t: ReconcileTxn }) {
  return (
    <div className={`${rowClass} border-[#ef4444]/40`}>
      <TxnMeta t={t} />
      <span
        className="text-xs text-[#606072] w-full md:w-auto md:ml-auto truncate"
        title={t.content ?? ""}
      >
        {t.content ?? "—"}
      </span>
    </div>
  );
}

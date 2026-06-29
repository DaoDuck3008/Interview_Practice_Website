"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, Eye, Download, X } from "lucide-react";
import { toast } from "react-toastify";
import {
  getOrdersAdmin,
  getOrderStats,
  getOrdersForExport,
  type AdminOrder,
  type OrderStats,
  type OrderStatus,
  type OrderDateField,
} from "@/lib/api/payments";
import type { Paginated } from "@/lib/api/questions";
import Pagination from "@/components/admin/Pagination";
import OrderDetailModal from "@/components/admin/OrderDetailModal";
import ReconcileView from "@/components/admin/ReconcileView";
import { formatDateTime, formatVnd } from "@/lib/utils/format";
import { ORDER_STATUS_META } from "@/lib/utils/subscriptions";

const controlStyle = { background: "#0d0d14", border: "1px solid #1c1c28" };
const selectClass =
  "px-3 py-2 rounded-lg text-sm text-[#f4f4f6] outline-none cursor-pointer";
const dateClass =
  "px-3 py-2 rounded-lg text-sm text-[#f4f4f6] outline-none cursor-pointer [color-scheme:dark]";

const EMPTY: Paginated<AdminOrder> = {
  items: [],
  total: 0,
  page: 1,
  limit: 30,
  totalPages: 1,
};

const GRID =
  "grid grid-cols-[150px_1.6fr_0.8fr_110px_110px_150px_56px] gap-4 px-5 items-center";

const STATUS_ORDER: OrderStatus[] = [
  "PAID",
  "PENDING",
  "FAILED",
  "EXPIRED",
  "CANCELED",
];

function csvCell(v: string | number): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function AdminPaymentsPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const [tab, setTab] = useState<"orders" | "reconcile">("orders");
  const [data, setData] = useState<Paginated<AdminOrder>>(EMPTY);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  // Bộ lọc — khởi tạo từ URL
  const [statusFilter, setStatusFilter] = useState<"" | OrderStatus>(
    (sp.get("status") ?? "") as "" | OrderStatus,
  );
  const [dateField, setDateField] = useState<OrderDateField>(
    (sp.get("dateField") ?? "createdAt") as OrderDateField,
  );
  const [from, setFrom] = useState(sp.get("from") ?? "");
  const [to, setTo] = useState(sp.get("to") ?? "");
  const [search, setSearch] = useState(sp.get("search") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(sp.get("search") ?? "");

  const [page, setPage] = useState(Number(sp.get("page") ?? "1"));
  const [limit, setLimit] = useState(Number(sp.get("limit") ?? "30"));

  // Debounce ô tìm kiếm + reset trang
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Đồng bộ state → URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (dateField !== "createdAt") params.set("dateField", dateField);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (page > 1) params.set("page", String(page));
    if (limit !== 30) params.set("limit", String(limit));
    const qs = params.toString();
    router.replace(`/admin/payments${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [statusFilter, dateField, from, to, debouncedSearch, page, limit]);

  const query = {
    status: statusFilter || undefined,
    dateField,
    from: from || undefined,
    to: to || undefined,
    search: debouncedSearch || undefined,
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getOrdersAdmin({ ...query, page, limit });
      if (res.items.length === 0 && res.page > 1) {
        setPage(res.page - 1);
        return;
      }
      setData(res);
    } catch {
      toast.error("Không tải được sổ cái giao dịch.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, dateField, from, to, debouncedSearch, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  // Thống kê (tải 1 lần)
  useEffect(() => {
    getOrderStats()
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  function setFilter<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }

  const hasFilters = statusFilter || from || to || search || debouncedSearch;

  function clearFilters() {
    setStatusFilter("");
    setFrom("");
    setTo("");
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
  }

  async function handleExport() {
    setExporting(true);
    try {
      const rows = await getOrdersForExport(query);
      if (rows.length === 0) {
        toast.info("Không có dữ liệu để xuất.");
        return;
      }
      const header = [
        "id",
        "Ngày tạo",
        "Thanh toán",
        "Tên",
        "Email",
        "Gói",
        "Số tiền",
        "Trạng thái",
        "Mã đơn",
        "Mã GD Sepay",
      ];
      const lines = rows.map((r) =>
        [
          r.id,
          r.createdAt,
          r.paidAt ?? "",
          r.user.name,
          r.user.email,
          r.plan.name,
          r.amountVnd,
          r.status,
          r.transferCode,
          r.providerTxnId ?? "",
        ]
          .map(csvCell)
          .join(","),
      );
      const csv = [header.join(","), ...lines].join("\n");
      // ﻿ (BOM) để Excel nhận UTF-8 tiếng Việt.
      const blob = new Blob([`﻿${csv}`], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `giao-dich-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Đã xuất ${rows.length} dòng.`);
    } catch {
      toast.error("Không thể xuất CSV.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-[#f4f4f6]">Giao dịch</h2>
        <p className="text-sm text-[#606072] mt-1">
          Sổ cái thanh toán — theo dõi và đối soát đơn hàng.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-[#1c1c28]">
        {(
          [
            ["orders", "Đơn hàng"],
            ["reconcile", "Đối soát ngân hàng"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer -mb-px border-b-2"
            style={{
              color: tab === key ? "#f4f4f6" : "#9898aa",
              borderColor: tab === key ? "#7c3aed" : "transparent",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "reconcile" ? (
        <ReconcileView />
      ) : (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-[#f4f4f6] transition-colors duration-200 cursor-pointer disabled:opacity-50"
              style={controlStyle}
            >
              {exporting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              Xuất CSV
            </button>
          </div>

          {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <StatCard label="Tổng doanh thu" value={stats && formatVnd(stats.revenueTotal)} />
        <StatCard label="Tháng này" value={stats && formatVnd(stats.revenueMonth)} />
        <StatCard label="Hôm nay" value={stats && formatVnd(stats.revenueToday)} />
      </div>
      <div className="rounded-2xl border border-[#1c1c28] bg-[#0d0d14] px-4 py-3 mb-6 flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-xs text-[#606072]">Đơn theo trạng thái</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {stats
            ? STATUS_ORDER.map((s) => {
                const meta = ORDER_STATUS_META[s];
                const n = stats.counts[s] ?? 0;
                return (
                  <span
                    key={s}
                    className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                    style={{
                      background: `${meta.color}1a`,
                      color: meta.color,
                      border: `1px solid ${meta.color}4d`,
                    }}
                    title={meta.label}
                  >
                    {meta.label} {n}
                  </span>
                );
              })
            : null}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#606072] pointer-events-none"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tên, email, mã đơn hoặc mã GD…"
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm text-[#f4f4f6] placeholder-[#3d3d54] outline-none"
            style={controlStyle}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) =>
            setFilter(setStatusFilter)(e.target.value as "" | OrderStatus)
          }
          className={selectClass}
          style={controlStyle}
        >
          <option value="">Mọi trạng thái</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s} className="bg-[#0d0d14]">
              {ORDER_STATUS_META[s].label}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1.5">
          <select
            value={dateField}
            onChange={(e) =>
              setFilter(setDateField)(e.target.value as OrderDateField)
            }
            className={selectClass}
            style={controlStyle}
          >
            <option value="createdAt" className="bg-[#0d0d14]">
              Ngày tạo
            </option>
            <option value="paidAt" className="bg-[#0d0d14]">
              Ngày thanh toán
            </option>
          </select>
          <input
            type="date"
            value={from}
            onChange={(e) => setFilter(setFrom)(e.target.value)}
            className={dateClass}
            style={controlStyle}
            aria-label="Từ ngày"
          />
          <span className="text-[#606072]">–</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setFilter(setTo)(e.target.value)}
            className={dateClass}
            style={controlStyle}
            aria-label="Đến ngày"
          />
        </div>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-[#9898aa] hover:text-[#f4f4f6] transition-colors cursor-pointer"
            style={controlStyle}
          >
            <X size={14} />
            Xóa lọc
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-[#1c1c28] bg-[#0d0d14] overflow-hidden">
        <div
          className={`${GRID} py-3 border-b border-[#1c1c28] text-xs font-medium uppercase tracking-wider text-[#606072]`}
        >
          <span>Ngày tạo</span>
          <span>Người dùng</span>
          <span>Gói</span>
          <span className="text-right">Số tiền</span>
          <span>Trạng thái</span>
          <span>Thanh toán</span>
          <span className="text-right">Xem</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-[#606072]">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : data.items.length === 0 ? (
          <p className="text-center py-16 text-sm text-[#606072]">
            Không có giao dịch nào khớp bộ lọc.
          </p>
        ) : (
          data.items.map((o) => {
            const meta = ORDER_STATUS_META[o.status];
            return (
              <div
                key={o.id}
                className={`${GRID} py-3.5 border-b border-[#1c1c28] last:border-0 hover:bg-[#13131c] transition-colors duration-150`}
              >
                <span className="text-xs text-[#9898aa]">
                  {formatDateTime(o.createdAt)}
                </span>
                <div className="min-w-0">
                  <p
                    className="text-sm text-[#f4f4f6] truncate"
                    title={o.user.name}
                  >
                    {o.user.name}
                  </p>
                  <p
                    className="text-xs text-[#606072] truncate"
                    title={o.user.email}
                  >
                    {o.user.email}
                  </p>
                </div>
                <span
                  className="text-sm text-[#9898aa] truncate"
                  title={o.plan.name}
                >
                  {o.plan.name}
                </span>
                <span className="text-sm text-[#f4f4f6] text-right font-medium">
                  {formatVnd(o.amountVnd)}
                </span>
                <span>
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
                </span>
                <span className="text-xs text-[#9898aa]">
                  {formatDateTime(o.paidAt)}
                </span>
                <div className="flex items-center justify-end">
                  <button
                    onClick={() => setDetailId(o.id)}
                    className="p-2 rounded-md text-[#606072] hover:text-[#8b5cf6] hover:bg-[#1c1c28] transition-colors cursor-pointer"
                    aria-label="Xem chi tiết"
                    title="Chi tiết / đối soát"
                  >
                    <Eye size={15} />
                  </button>
                </div>
              </div>
            );
          })
        )}

        {!loading && data.total > 0 && (
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(l) => {
              setLimit(l);
              setPage(1);
            }}
          />
        )}
      </div>

          <OrderDetailModal
            orderId={detailId}
            onClose={() => setDetailId(null)}
          />
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="rounded-2xl border border-[#1c1c28] bg-[#0d0d14] px-4 py-3">
      <p className="text-xs text-[#606072] mb-1">{label}</p>
      {value ? (
        <p className="text-xl font-bold text-[#f4f4f6]">{value}</p>
      ) : (
        <div className="h-7 w-24 rounded bg-[#1c1c28] animate-pulse" />
      )}
    </div>
  );
}

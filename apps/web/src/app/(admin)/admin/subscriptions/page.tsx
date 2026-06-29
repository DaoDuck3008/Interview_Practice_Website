"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Loader2,
  Search,
  RefreshCw,
  Ban,
  RotateCcw,
  Receipt,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  getSubscriptionsAdmin,
  cancelSubscription,
  activateSubscription,
  renewSubscription,
  type AdminSubscription,
  type SubscriptionStatus,
} from "@/lib/api/subscriptions";
import type { Paginated } from "@/lib/api/questions";
import Pagination from "@/components/admin/Pagination";
import SubscriptionOrdersModal from "@/components/admin/SubscriptionOrdersModal";
import { useStatusModal } from "@/components/ui/useStatusModal";
import { formatDay } from "@/lib/utils/format";
import { SUBSCRIPTION_STATUS_META } from "@/lib/utils/subscriptions";

const controlStyle = { background: "#0d0d14", border: "1px solid #1c1c28" };
const selectClass =
  "px-3 py-2 rounded-lg text-sm text-[#f4f4f6] outline-none cursor-pointer";

const EMPTY: Paginated<AdminSubscription> = {
  items: [],
  total: 0,
  page: 1,
  limit: 30,
  totalPages: 1,
};

const GRID =
  "grid grid-cols-[1.6fr_1fr_110px_110px_110px_124px] gap-4 px-5 items-center";

export default function AdminSubscriptionsPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const [data, setData] = useState<Paginated<AdminSubscription>>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [ordersOf, setOrdersOf] = useState<AdminSubscription | null>(null);

  const { confirm, statusModal } = useStatusModal();

  // Bộ lọc — khởi tạo từ URL
  const [statusFilter, setStatusFilter] = useState<"" | SubscriptionStatus>(
    (sp.get("status") ?? "") as "" | SubscriptionStatus,
  );
  const [startedFrom, setStartedFrom] = useState(sp.get("startedFrom") ?? "");
  const [startedTo, setStartedTo] = useState(sp.get("startedTo") ?? "");
  const [search, setSearch] = useState(sp.get("search") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(
    sp.get("search") ?? "",
  );

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

  // Đồng bộ state → URL để giữ bộ lọc khi back
  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (startedFrom) params.set("startedFrom", startedFrom);
    if (startedTo) params.set("startedTo", startedTo);
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (page > 1) params.set("page", String(page));
    if (limit !== 30) params.set("limit", String(limit));
    const qs = params.toString();
    router.replace(`/admin/subscriptions${qs ? `?${qs}` : ""}`, {
      scroll: false,
    });
  }, [statusFilter, startedFrom, startedTo, debouncedSearch, page, limit]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSubscriptionsAdmin({
        status: statusFilter || undefined,
        startedFrom: startedFrom || undefined,
        startedTo: startedTo || undefined,
        search: debouncedSearch || undefined,
        page,
        limit,
      });
      if (res.items.length === 0 && res.page > 1) {
        setPage(res.page - 1);
        return;
      }
      setData(res);
    } catch {
      toast.error("Không tải được danh sách gói đăng ký.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, startedFrom, startedTo, debouncedSearch, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  function setFilter<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }

  const hasFilters =
    statusFilter || startedFrom || startedTo || search || debouncedSearch;

  function clearFilters() {
    setStatusFilter("");
    setStartedFrom("");
    setStartedTo("");
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
  }

  async function handleRenew(s: AdminSubscription) {
    const ok = await confirm({
      type: "info",
      title: "Gia hạn thủ công?",
      message: `Cộng thêm ${s.plan.durationDays} ngày cho "${s.user.name}" (gói ${s.plan.name}). Gói sẽ chuyển sang trạng thái Đang dùng.`,
      confirmText: "Gia hạn",
    });
    if (!ok) return;
    setBusyId(s.id);
    try {
      await renewSubscription(s.id);
      toast.success("Đã gia hạn gói đăng ký.");
      await load();
    } catch {
      toast.error("Không thể gia hạn gói đăng ký.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancel(s: AdminSubscription) {
    const ok = await confirm({
      type: "error",
      title: "Hủy gói đăng ký?",
      message: `Gói của "${s.user.name}" sẽ bị hủy ngay lập tức và người dùng mất quyền truy cập. Bạn có thể kích hoạt lại sau.`,
      confirmText: "Hủy gói",
    });
    if (!ok) return;
    setBusyId(s.id);
    try {
      await cancelSubscription(s.id);
      toast.success("Đã hủy gói đăng ký.");
      await load();
    } catch {
      toast.error("Không thể hủy gói đăng ký.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleActivate(s: AdminSubscription) {
    const ok = await confirm({
      type: "info",
      title: "Kích hoạt lại gói?",
      message: `Gói của "${s.user.name}" sẽ chuyển về trạng thái Đang dùng (giữ nguyên ngày hết hạn ${formatDay(s.expiresAt)}).`,
      confirmText: "Kích hoạt",
    });
    if (!ok) return;
    setBusyId(s.id);
    try {
      await activateSubscription(s.id);
      toast.success("Đã kích hoạt lại gói đăng ký.");
      await load();
    } catch {
      toast.error("Không thể kích hoạt lại gói đăng ký.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#f4f4f6]">Gói đăng ký</h2>
        <p className="text-sm text-[#606072] mt-1">
          Theo dõi và quản lý gói đăng ký của người dùng.
        </p>
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
            placeholder="Tìm theo tên hoặc email…"
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm text-[#f4f4f6] placeholder-[#3d3d54] outline-none"
            style={controlStyle}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) =>
            setFilter(setStatusFilter)(
              e.target.value as "" | SubscriptionStatus,
            )
          }
          className={selectClass}
          style={controlStyle}
        >
          <option value="">Mọi trạng thái</option>
          <option value="ACTIVE" className="bg-[#0d0d14]">
            Đang dùng
          </option>
          <option value="EXPIRED" className="bg-[#0d0d14]">
            Hết hạn
          </option>
          <option value="CANCELED" className="bg-[#0d0d14]">
            Đã hủy
          </option>
        </select>

        <div className="flex items-center gap-1.5">
          <span className="text-sm text-[#606072]">Bắt đầu:</span>
          <input
            type="date"
            value={startedFrom}
            onChange={(e) => setFilter(setStartedFrom)(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm text-[#f4f4f6] outline-none cursor-pointer [color-scheme:dark]"
            style={controlStyle}
            aria-label="Từ ngày"
          />
          <span className="text-[#606072]">–</span>
          <input
            type="date"
            value={startedTo}
            onChange={(e) => setFilter(setStartedTo)(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm text-[#f4f4f6] outline-none cursor-pointer [color-scheme:dark]"
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
          <span>Người dùng</span>
          <span>Gói</span>
          <span>Trạng thái</span>
          <span>Bắt đầu</span>
          <span>Hết hạn</span>
          <span className="text-right">Thao tác</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-[#606072]">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : data.items.length === 0 ? (
          <p className="text-center py-16 text-sm text-[#606072]">
            Không có gói đăng ký nào khớp bộ lọc.
          </p>
        ) : (
          data.items.map((s) => {
            const meta = SUBSCRIPTION_STATUS_META[s.status];
            const busy = busyId === s.id;
            return (
              <div
                key={s.id}
                className={`${GRID} py-3.5 border-b border-[#1c1c28] last:border-0 hover:bg-[#13131c] transition-colors duration-150`}
              >
                <div className="min-w-0">
                  <p
                    className="text-sm text-[#f4f4f6] truncate"
                    title={s.user.name}
                  >
                    {s.user.name}
                  </p>
                  <p
                    className="text-xs text-[#606072] truncate"
                    title={s.user.email}
                  >
                    {s.user.email}
                  </p>
                </div>
                <span
                  className="text-sm text-[#9898aa] truncate"
                  title={s.plan.name}
                >
                  {s.plan.name}
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
                <span className="text-sm text-[#9898aa]">
                  {formatDay(s.startedAt)}
                </span>
                <span className="text-sm text-[#9898aa]">
                  {formatDay(s.expiresAt)}
                </span>
                <div className="flex items-center justify-end gap-1">
                  {busy ? (
                    <Loader2
                      size={15}
                      className="animate-spin text-[#606072]"
                    />
                  ) : (
                    <>
                      <button
                        onClick={() => setOrdersOf(s)}
                        className="p-2 rounded-md text-[#606072] hover:text-[#8b5cf6] hover:bg-[#1c1c28] transition-colors cursor-pointer"
                        aria-label="Xem lịch sử giao dịch"
                        title="Lịch sử giao dịch"
                      >
                        <Receipt size={15} />
                      </button>
                      <button
                        onClick={() => handleRenew(s)}
                        className="p-2 rounded-md text-[#606072] hover:text-[#22c55e] hover:bg-[#1c1c28] transition-colors cursor-pointer"
                        aria-label="Gia hạn thủ công"
                        title="Gia hạn thủ công"
                      >
                        <RefreshCw size={15} />
                      </button>
                      {s.status === "ACTIVE" && (
                        <button
                          onClick={() => handleCancel(s)}
                          className="p-2 rounded-md text-[#606072] hover:text-[#ef4444] hover:bg-[#1c1c28] transition-colors cursor-pointer"
                          aria-label="Hủy gói"
                          title="Hủy gói"
                        >
                          <Ban size={15} />
                        </button>
                      )}
                      {s.status === "CANCELED" && (
                        <button
                          onClick={() => handleActivate(s)}
                          className="p-2 rounded-md text-[#606072] hover:text-[#22c55e] hover:bg-[#1c1c28] transition-colors cursor-pointer"
                          aria-label="Kích hoạt lại"
                          title="Kích hoạt lại"
                        >
                          <RotateCcw size={15} />
                        </button>
                      )}
                    </>
                  )}
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

      <SubscriptionOrdersModal
        subscription={ordersOf}
        onClose={() => setOrdersOf(null)}
      />

      {statusModal}
    </div>
  );
}

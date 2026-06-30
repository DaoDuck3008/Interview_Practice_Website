"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Loader2,
  Search,
  Gift,
  X,
  Lock,
  Unlock,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  getUsersAdmin,
  setUserLock,
  verifyUserManually,
  resetUserPassword,
  type AdminUser,
} from "@/lib/api/users";
import { getPlans, type Plan } from "@/lib/api/plans";
import type { Paginated } from "@/lib/api/questions";
import Pagination from "@/components/admin/Pagination";
import GrantSubscriptionModal from "@/components/admin/GrantSubscriptionModal";
import StatusModal, { type StatusType } from "@/components/ui/StatusModal";
import { formatDay } from "@/lib/utils/format";
import { SUBSCRIPTION_STATUS_META } from "@/lib/utils/subscriptions";

const controlClass =
  "bg-[var(--color-surface)] border border-[var(--color-border)]";
const selectClass = `px-3 py-2 rounded-lg text-sm text-[var(--color-text-primary)] outline-none cursor-pointer ${controlClass}`;

const EMPTY: Paginated<AdminUser> = {
  items: [],
  total: 0,
  page: 1,
  limit: 30,
  totalPages: 1,
};

const GRID =
  "grid grid-cols-[1.6fr_140px_1fr_110px_150px] gap-4 px-5 items-center";

type SortKey = "createdAt:desc" | "createdAt:asc" | "name:asc" | "name:desc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "createdAt:desc", label: "Mới nhất" },
  { value: "createdAt:asc", label: "Cũ nhất" },
  { value: "name:asc", label: "Tên A → Z" },
  { value: "name:desc", label: "Tên Z → A" },
];

// Hành động đang chờ xác nhận qua StatusModal.
type PendingAction = { kind: "lock" | "verify" | "reset"; user: AdminUser };

export default function AdminUsersPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const [data, setData] = useState<Paginated<AdminUser>>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [grantUser, setGrantUser] = useState<AdminUser | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [acting, setActing] = useState(false);

  const [search, setSearch] = useState(sp.get("search") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(sp.get("search") ?? "");
  const [plan, setPlan] = useState(sp.get("plan") ?? "");
  const [verified, setVerified] = useState(sp.get("verified") ?? "");
  const [locked, setLocked] = useState(sp.get("locked") ?? "");
  const [sortKey, setSortKey] = useState<SortKey>(
    (sp.get("sort") && sp.get("order")
      ? `${sp.get("sort")}:${sp.get("order")}`
      : "createdAt:desc") as SortKey,
  );
  const [page, setPage] = useState(Number(sp.get("page") ?? "1"));
  const [limit, setLimit] = useState(Number(sp.get("limit") ?? "30"));

  useEffect(() => {
    getPlans()
      .then(setPlans)
      .catch(() => {});
  }, []);

  // Debounce ô tìm kiếm. Bỏ qua lần chạy đầu để không reset deep-link (?page=N).
  const firstSearch = useRef(true);
  useEffect(() => {
    if (firstSearch.current) {
      firstSearch.current = false;
      return;
    }
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const [sort, order] = sortKey.split(":");
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (plan) params.set("plan", plan);
    if (verified) params.set("verified", verified);
    if (locked) params.set("locked", locked);
    if (sortKey !== "createdAt:desc") {
      params.set("sort", sort);
      params.set("order", order);
    }
    if (page > 1) params.set("page", String(page));
    if (limit !== 30) params.set("limit", String(limit));
    const qs = params.toString();
    router.replace(`/admin/users${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [debouncedSearch, plan, verified, locked, sortKey, page, limit]);

  const load = useCallback(async () => {
    setLoading(true);
    const [sort, order] = sortKey.split(":") as ["name" | "createdAt", "asc" | "desc"];
    try {
      const res = await getUsersAdmin({
        search: debouncedSearch || undefined,
        plan: plan || undefined,
        verified: (verified || undefined) as "true" | "false" | undefined,
        locked: (locked || undefined) as "true" | "false" | undefined,
        sort,
        order,
        page,
        limit,
      });
      if (res.items.length === 0 && res.page > 1) {
        setPage(res.page - 1);
        return;
      }
      setData(res);
    } catch {
      toast.error("Không tải được danh sách người dùng.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, plan, verified, locked, sortKey, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  // Đổi bộ lọc → quay về trang 1.
  function changeFilter<T>(setter: (v: T) => void, value: T) {
    setter(value);
    setPage(1);
  }

  const hasFilters = !!(search || plan || verified || locked) || sortKey !== "createdAt:desc";

  function resetFilters() {
    setSearch("");
    setDebouncedSearch("");
    setPlan("");
    setVerified("");
    setLocked("");
    setSortKey("createdAt:desc");
    setPage(1);
  }

  async function confirmAction() {
    if (!pending) return;
    const { kind, user } = pending;
    setActing(true);
    try {
      if (kind === "lock") {
        await setUserLock(user.id, !user.isLock);
        toast.success(user.isLock ? "Đã mở khóa tài khoản." : "Đã khóa tài khoản.");
      } else if (kind === "verify") {
        await verifyUserManually(user.id);
        toast.success("Đã xác thực tài khoản.");
      } else {
        const res = await resetUserPassword(user.id);
        toast.success(res.message);
      }
      setPending(null);
      await load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      toast.error(msg || "Thao tác thất bại. Vui lòng thử lại.");
    } finally {
      setActing(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
          Người dùng
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Quản lý người dùng, cấp gói và xử lý tài khoản khi hỗ trợ khách hàng.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc email…"
            className={`w-full pl-9 pr-3 py-2 rounded-lg text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-faint)] outline-none ${controlClass}`}
          />
        </div>

        <select
          value={plan}
          onChange={(e) => changeFilter(setPlan, e.target.value)}
          className={selectClass}
        >
          <option value="">Tất cả gói</option>
          <option value="free">Chưa có gói (Free)</option>
          {plans.map((p) => (
            <option key={p.id} value={p.slug}>
              {p.name}
            </option>
          ))}
        </select>

        <select
          value={verified}
          onChange={(e) => changeFilter(setVerified, e.target.value)}
          className={selectClass}
        >
          <option value="">Mọi xác thực</option>
          <option value="true">Đã xác thực</option>
          <option value="false">Chưa xác thực</option>
        </select>

        <select
          value={locked}
          onChange={(e) => changeFilter(setLocked, e.target.value)}
          className={selectClass}
        >
          <option value="">Mọi trạng thái</option>
          <option value="false">Đang hoạt động</option>
          <option value="true">Đã khóa</option>
        </select>

        <select
          value={sortKey}
          onChange={(e) => changeFilter(setSortKey, e.target.value as SortKey)}
          className={selectClass}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {hasFilters && (
          <button
            onClick={resetFilters}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer ${controlClass}`}
          >
            <X size={14} />
            Xóa lọc
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
        <div
          className={`${GRID} py-3 border-b border-[var(--color-border)] text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]`}
        >
          <span>Người dùng</span>
          <span>Trạng thái</span>
          <span>Gói hiện tại</span>
          <span>Ngày tạo</span>
          <span className="text-right">Thao tác</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-[var(--color-text-muted)]">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : data.items.length === 0 ? (
          <p className="text-center py-16 text-sm text-[var(--color-text-muted)]">
            Không có người dùng nào khớp bộ lọc.
          </p>
        ) : (
          data.items.map((u) => {
            const sub = u.subscription;
            const meta = sub ? SUBSCRIPTION_STATUS_META[sub.status] : null;
            const isAdmin = u.role === "ADMIN";
            return (
              <div
                key={u.id}
                className={`${GRID} py-3.5 border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-elevated)] transition-colors duration-150`}
              >
                <div className="min-w-0">
                  <p
                    className="text-sm text-[var(--color-text-primary)] truncate"
                    title={u.name}
                  >
                    {u.name}
                    {isAdmin && (
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent-light)]">
                        admin
                      </span>
                    )}
                  </p>
                  <p
                    className="text-xs text-[var(--color-text-muted)] truncate"
                    title={u.email}
                  >
                    {u.email}
                  </p>
                </div>

                {/* Trạng thái */}
                <div className="flex flex-col gap-1 items-start">
                  {u.emailVerified ? (
                    <Badge color="#22c55e" icon={CheckCircle2} label="Đã xác thực" />
                  ) : (
                    <Badge
                      color="#f59e0b"
                      icon={AlertTriangle}
                      label="Chưa xác thực"
                    />
                  )}
                  {u.isLock && (
                    <Badge color="#ef4444" icon={Lock} label="Đã khóa" />
                  )}
                </div>

                <span className="min-w-0">
                  {sub && meta ? (
                    <span className="text-xs text-[var(--color-text-secondary)] truncate inline-flex items-center gap-1.5">
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{
                          background: `${meta.color}1a`,
                          color: meta.color,
                          border: `1px solid ${meta.color}4d`,
                        }}
                      >
                        {meta.label}
                      </span>
                      {sub.planName} · {formatDay(sub.expiresAt)}
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--color-text-muted)]">
                      —
                    </span>
                  )}
                </span>

                <span className="text-xs text-[var(--color-text-secondary)]">
                  {formatDay(u.createdAt)}
                </span>

                <div className="flex items-center justify-end gap-0.5">
                  <IconAction
                    icon={Gift}
                    title="Cấp gói thủ công"
                    color="var(--color-accent-light)"
                    onClick={() => setGrantUser(u)}
                  />
                  {!isAdmin && (
                    <>
                      {!u.emailVerified && (
                        <IconAction
                          icon={ShieldCheck}
                          title="Xác thực thủ công"
                          color="#22c55e"
                          onClick={() => setPending({ kind: "verify", user: u })}
                        />
                      )}
                      <IconAction
                        icon={KeyRound}
                        title={
                          u.isGoogle
                            ? "Tài khoản cấp bởi Google"
                            : "Đặt lại mật khẩu"
                        }
                        color="var(--color-text-secondary)"
                        disabled={u.isGoogle}
                        onClick={() => setPending({ kind: "reset", user: u })}
                      />
                      <IconAction
                        icon={u.isLock ? Unlock : Lock}
                        title={u.isLock ? "Mở khóa tài khoản" : "Khóa tài khoản"}
                        color={u.isLock ? "#22c55e" : "#ef4444"}
                        onClick={() => setPending({ kind: "lock", user: u })}
                      />
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

      <GrantSubscriptionModal
        user={grantUser}
        onClose={() => setGrantUser(null)}
        onGranted={load}
      />

      <StatusModal
        open={!!pending}
        type={modalConfig(pending).type}
        title={modalConfig(pending).title}
        message={modalConfig(pending).message}
        confirmText={modalConfig(pending).confirmText}
        onConfirm={acting ? undefined : confirmAction}
        onClose={() => !acting && setPending(null)}
      />
    </div>
  );
}

// Cấu hình nội dung modal xác nhận theo hành động đang chờ.
function modalConfig(pending: PendingAction | null): {
  type: StatusType;
  title: string;
  message: string;
  confirmText: string;
} {
  if (!pending)
    return { type: "info", title: "", message: "", confirmText: "Xác nhận" };
  const { kind, user } = pending;
  if (kind === "verify")
    return {
      type: "info",
      title: "Xác thực tài khoản?",
      message: `Đánh dấu ${user.email} là đã xác thực email. Người dùng sẽ đăng nhập được ngay.`,
      confirmText: "Xác thực",
    };
  if (kind === "reset")
    return {
      type: "alert",
      title: "Đặt lại mật khẩu?",
      message: `Hệ thống sẽ tạo mật khẩu mới và gửi tới ${user.email}. Mật khẩu hiện tại sẽ không dùng được nữa.`,
      confirmText: "Đặt lại",
    };
  // lock / unlock
  return user.isLock
    ? {
        type: "info",
        title: "Mở khóa tài khoản?",
        message: `Mở khóa cho ${user.name}. Người dùng sẽ đăng nhập lại được.`,
        confirmText: "Mở khóa",
      }
    : {
        type: "error",
        title: "Khóa tài khoản?",
        message: `Khóa ${user.name}. Toàn bộ phiên đăng nhập hiện tại sẽ bị thu hồi.`,
        confirmText: "Khóa",
      };
}

function Badge({
  color,
  icon: Icon,
  label,
}: {
  color: string;
  icon: typeof CheckCircle2;
  label: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
      style={{
        background: `${color}1a`,
        color,
        border: `1px solid ${color}4d`,
      }}
    >
      <Icon size={11} />
      {label}
    </span>
  );
}

function IconAction({
  icon: Icon,
  title,
  color,
  onClick,
  disabled,
}: {
  icon: typeof Gift;
  title: string;
  color: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className="flex items-center justify-center w-8 h-8 rounded-md transition-colors enabled:hover:bg-[var(--color-border)] enabled:cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ color }}
    >
      <Icon size={15} />
    </button>
  );
}

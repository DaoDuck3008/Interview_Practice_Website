"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, Gift, X } from "lucide-react";
import { toast } from "react-toastify";
import { getUsersAdmin, type AdminUser } from "@/lib/api/users";
import type { Paginated } from "@/lib/api/questions";
import Pagination from "@/components/admin/Pagination";
import GrantSubscriptionModal from "@/components/admin/GrantSubscriptionModal";
import { formatDay } from "@/lib/utils/format";
import { SUBSCRIPTION_STATUS_META } from "@/lib/utils/subscriptions";

const controlClass =
  "bg-[var(--color-surface)] border border-[var(--color-border)]";

const EMPTY: Paginated<AdminUser> = {
  items: [],
  total: 0,
  page: 1,
  limit: 30,
  totalPages: 1,
};

const GRID = "grid grid-cols-[1.8fr_120px_1fr_120px] gap-4 px-5 items-center";

export default function AdminUsersPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const [data, setData] = useState<Paginated<AdminUser>>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [grantUser, setGrantUser] = useState<AdminUser | null>(null);

  const [search, setSearch] = useState(sp.get("search") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(sp.get("search") ?? "");
  const [page, setPage] = useState(Number(sp.get("page") ?? "1"));
  const [limit, setLimit] = useState(Number(sp.get("limit") ?? "30"));

  // Bỏ qua lần chạy đầu để không reset trang đã deep-link (?page=N) về 1.
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
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (page > 1) params.set("page", String(page));
    if (limit !== 30) params.set("limit", String(limit));
    const qs = params.toString();
    router.replace(`/admin/users${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [debouncedSearch, page, limit]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getUsersAdmin({
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
      toast.error("Không tải được danh sách người dùng.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
          Người dùng
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Quản lý người dùng và cấp gói thủ công khi hỗ trợ khách hàng.
        </p>
      </div>

      {/* Search */}
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
        {search && (
          <button
            onClick={() => setSearch("")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer ${controlClass}`}
          >
            <X size={14} />
            Xóa
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
        <div
          className={`${GRID} py-3 border-b border-[var(--color-border)] text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]`}
        >
          <span>Người dùng</span>
          <span>Ngày tạo</span>
          <span>Gói hiện tại</span>
          <span className="text-right">Thao tác</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-[var(--color-text-muted)]">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : data.items.length === 0 ? (
          <p className="text-center py-16 text-sm text-[var(--color-text-muted)]">
            Không có người dùng nào khớp tìm kiếm.
          </p>
        ) : (
          data.items.map((u) => {
            const sub = u.subscription;
            const meta = sub ? SUBSCRIPTION_STATUS_META[sub.status] : null;
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
                    {u.role === "ADMIN" && (
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
                <span className="text-xs text-[var(--color-text-secondary)]">
                  {formatDay(u.createdAt)}
                </span>
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
                <div className="flex items-center justify-end">
                  <button
                    onClick={() => setGrantUser(u)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-[var(--color-accent-light)] hover:bg-[var(--color-border)] transition-colors cursor-pointer"
                    title="Cấp gói thủ công"
                  >
                    <Gift size={14} />
                    Cấp gói
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

      <GrantSubscriptionModal
        user={grantUser}
        onClose={() => setGrantUser(null)}
        onGranted={load}
      />
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, Gift, X } from "lucide-react";
import { toast } from "react-toastify";
import { getUsersAdmin, type AdminUser } from "@/lib/api/users";
import type { Paginated } from "@/lib/api/questions";
import Pagination from "@/components/admin/Pagination";
import GrantSubscriptionModal from "@/components/admin/GrantSubscriptionModal";
import { formatDay } from "@/lib/utils/format";
import { SUBSCRIPTION_STATUS_META } from "@/lib/utils/subscriptions";

const controlStyle = { background: "#0d0d14", border: "1px solid #1c1c28" };

const EMPTY: Paginated<AdminUser> = {
  items: [],
  total: 0,
  page: 1,
  limit: 30,
  totalPages: 1,
};

const GRID =
  "grid grid-cols-[1.8fr_120px_1fr_120px] gap-4 px-5 items-center";

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

  useEffect(() => {
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
        <h2 className="text-2xl font-bold text-[#f4f4f6]">Người dùng</h2>
        <p className="text-sm text-[#606072] mt-1">
          Quản lý người dùng và cấp gói thủ công khi hỗ trợ khách hàng.
        </p>
      </div>

      {/* Search */}
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
        {search && (
          <button
            onClick={() => setSearch("")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-[#9898aa] hover:text-[#f4f4f6] transition-colors cursor-pointer"
            style={controlStyle}
          >
            <X size={14} />
            Xóa
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-[#1c1c28] bg-[#0d0d14] overflow-hidden">
        <div
          className={`${GRID} py-3 border-b border-[#1c1c28] text-xs font-medium uppercase tracking-wider text-[#606072]`}
        >
          <span>Người dùng</span>
          <span>Ngày tạo</span>
          <span>Gói hiện tại</span>
          <span className="text-right">Thao tác</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-[#606072]">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : data.items.length === 0 ? (
          <p className="text-center py-16 text-sm text-[#606072]">
            Không có người dùng nào khớp tìm kiếm.
          </p>
        ) : (
          data.items.map((u) => {
            const sub = u.subscription;
            const meta = sub ? SUBSCRIPTION_STATUS_META[sub.status] : null;
            return (
              <div
                key={u.id}
                className={`${GRID} py-3.5 border-b border-[#1c1c28] last:border-0 hover:bg-[#13131c] transition-colors duration-150`}
              >
                <div className="min-w-0">
                  <p className="text-sm text-[#f4f4f6] truncate" title={u.name}>
                    {u.name}
                    {u.role === "ADMIN" && (
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-[#8b5cf6]">
                        admin
                      </span>
                    )}
                  </p>
                  <p
                    className="text-xs text-[#606072] truncate"
                    title={u.email}
                  >
                    {u.email}
                  </p>
                </div>
                <span className="text-xs text-[#9898aa]">
                  {formatDay(u.createdAt)}
                </span>
                <span className="min-w-0">
                  {sub && meta ? (
                    <span className="text-xs text-[#9898aa] truncate inline-flex items-center gap-1.5">
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
                    <span className="text-xs text-[#606072]">—</span>
                  )}
                </span>
                <div className="flex items-center justify-end">
                  <button
                    onClick={() => setGrantUser(u)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-[#8b5cf6] hover:bg-[#1c1c28] transition-colors cursor-pointer"
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

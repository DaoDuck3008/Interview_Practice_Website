"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, Loader2, Search, ShieldCheck, X } from "lucide-react";
import { toast } from "react-toastify";
import {
  getAuditLogsAdmin,
  type AuditAction,
  type AuditActorType,
  type AuditLogListItem,
} from "@/lib/api/auditLogs";
import type { Paginated } from "@/lib/api/questions";
import Pagination from "@/components/admin/Pagination";
import AuditLogDetailModal, {
  ACTION_LABEL,
  ACTOR_LABEL,
} from "@/components/admin/AuditLogDetailModal";
import { formatDateTime } from "@/lib/utils/format";

const controlStyle = { background: "#0d0d14", border: "1px solid #1c1c28" };
const inputClass =
  "rounded-lg px-3 py-2 text-sm text-[#f4f4f6] outline-none placeholder-[#3d3d54]";
const selectClass =
  "rounded-lg px-3 py-2 text-sm text-[#f4f4f6] outline-none cursor-pointer";

const EMPTY: Paginated<AuditLogListItem> = {
  items: [],
  total: 0,
  page: 1,
  limit: 30,
  totalPages: 1,
};

const ENTITY_TYPES = [
  "User",
  "Plan",
  "Topic",
  "Question",
  "Order",
  "Subscription",
  "Session",
  "Score",
];

const GRID =
  "grid grid-cols-[170px_120px_1.4fr_1fr_1.1fr_92px_56px] gap-4 px-5 items-center";

function statusBadge(success: boolean, errorCode: string | null) {
  if (success) {
    return (
      <span className="rounded-md border border-[#22c55e4d] bg-[#22c55e1a] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#22c55e]">
        OK
      </span>
    );
  }
  return (
    <span
      className="rounded-md border border-[#ef44444d] bg-[#ef44441a] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#ef4444]"
      title={errorCode ?? undefined}
    >
      Lỗi
    </span>
  );
}

export default function AdminAuditLogsPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const [data, setData] = useState<Paginated<AuditLogListItem>>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<string | null>(null);

  const [search, setSearch] = useState(sp.get("search") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(sp.get("search") ?? "");
  const [actorType, setActorType] = useState<"" | AuditActorType>(
    (sp.get("actorType") ?? "") as "" | AuditActorType,
  );
  const [action, setAction] = useState<"" | AuditAction>(
    (sp.get("action") ?? "") as "" | AuditAction,
  );
  const [entityType, setEntityType] = useState(sp.get("entityType") ?? "");
  const [from, setFrom] = useState(sp.get("from") ?? "");
  const [to, setTo] = useState(sp.get("to") ?? "");
  const [page, setPage] = useState(Number(sp.get("page") ?? "1"));
  const [limit, setLimit] = useState(Number(sp.get("limit") ?? "30"));

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
    if (actorType) params.set("actorType", actorType);
    if (action) params.set("action", action);
    if (entityType) params.set("entityType", entityType);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (page > 1) params.set("page", String(page));
    if (limit !== 30) params.set("limit", String(limit));
    const qs = params.toString();
    router.replace(`/admin/audit-logs${qs ? `?${qs}` : ""}`, {
      scroll: false,
    });
  }, [debouncedSearch, actorType, action, entityType, from, to, page, limit]);

  const query = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      actorType: actorType || undefined,
      action: action || undefined,
      entityType: entityType || undefined,
      from: from || undefined,
      to: to || undefined,
    }),
    [debouncedSearch, actorType, action, entityType, from, to],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAuditLogsAdmin({ ...query, page, limit });
      if (res.items.length === 0 && res.page > 1) {
        setPage(res.page - 1);
        return;
      }
      setData(res);
    } catch {
      toast.error("Không tải được audit log.");
    } finally {
      setLoading(false);
    }
  }, [query, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  function setFilter<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  const hasFilters =
    search || debouncedSearch || actorType || action || entityType || from || to;

  function clearFilters() {
    setSearch("");
    setDebouncedSearch("");
    setActorType("");
    setAction("");
    setEntityType("");
    setFrom("");
    setTo("");
    setPage(1);
  }

  return (
    <div>
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2 text-[#8b5cf6]">
          <ShieldCheck size={18} />
          <span className="text-xs font-bold uppercase tracking-wider">
            Security trail
          </span>
        </div>
        <h2 className="text-2xl font-bold text-[#f4f4f6]">Audit log</h2>
        <p className="mt-1 text-sm text-[#606072]">
          Theo dõi các thao tác nhạy cảm, thay đổi dữ liệu và luồng tự động quan trọng.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#606072]"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm email, actorId, entityId, IP hoặc path..."
            className={`${inputClass} w-full pl-9`}
            style={controlStyle}
          />
        </div>

        <select
          value={actorType}
          onChange={(e) =>
            setFilter(setActorType)(e.target.value as "" | AuditActorType)
          }
          className={selectClass}
          style={controlStyle}
        >
          <option value="">Mọi actor</option>
          {(Object.keys(ACTOR_LABEL) as AuditActorType[]).map((key) => (
            <option key={key} value={key} className="bg-[#0d0d14]">
              {ACTOR_LABEL[key]}
            </option>
          ))}
        </select>

        <select
          value={action}
          onChange={(e) =>
            setFilter(setAction)(e.target.value as "" | AuditAction)
          }
          className={`${selectClass} max-w-[260px]`}
          style={controlStyle}
        >
          <option value="">Mọi hành động</option>
          {(Object.keys(ACTION_LABEL) as AuditAction[]).map((key) => (
            <option key={key} value={key} className="bg-[#0d0d14]">
              {ACTION_LABEL[key]}
            </option>
          ))}
        </select>

        <select
          value={entityType}
          onChange={(e) => setFilter(setEntityType)(e.target.value)}
          className={selectClass}
          style={controlStyle}
        >
          <option value="">Mọi đối tượng</option>
          {ENTITY_TYPES.map((type) => (
            <option key={type} value={type} className="bg-[#0d0d14]">
              {type}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={from}
          onChange={(e) => setFilter(setFrom)(e.target.value)}
          className={`${selectClass} [color-scheme:dark]`}
          style={controlStyle}
          aria-label="Từ ngày"
        />
        <span className="text-[#606072]">–</span>
        <input
          type="date"
          value={to}
          onChange={(e) => setFilter(setTo)(e.target.value)}
          className={`${selectClass} [color-scheme:dark]`}
          style={controlStyle}
          aria-label="Đến ngày"
        />

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-[#9898aa] transition-colors hover:text-[#f4f4f6]"
            style={controlStyle}
          >
            <X size={14} />
            Xóa lọc
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#1c1c28] bg-[#0d0d14]">
        <div className="overflow-x-auto">
          <div className="min-w-[1040px]">
            <div
              className={`${GRID} border-b border-[#1c1c28] py-3 text-xs font-medium uppercase tracking-wider text-[#606072]`}
            >
              <span>Thời gian</span>
              <span>Actor</span>
              <span>Hành động</span>
              <span>Đối tượng</span>
              <span>Request</span>
              <span>Kết quả</span>
              <span className="text-right">Xem</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 text-[#606072]">
                <Loader2 size={18} className="animate-spin" />
              </div>
            ) : data.items.length === 0 ? (
              <p className="py-16 text-center text-sm text-[#606072]">
                Không có audit log nào khớp bộ lọc.
              </p>
            ) : (
              data.items.map((log) => (
                <div
                  key={log.id}
                  className={`${GRID} border-b border-[#1c1c28] py-3.5 transition-colors last:border-0 hover:bg-[#13131c]`}
                >
                  <span className="text-xs text-[#9898aa]">
                    {formatDateTime(log.createdAt)}
                  </span>

                  <div className="min-w-0">
                    <p className="text-sm text-[#f4f4f6]">
                      {ACTOR_LABEL[log.actorType]}
                    </p>
                    <p
                      className="truncate text-xs text-[#606072]"
                      title={log.actorEmail ?? log.actorId ?? undefined}
                    >
                      {log.actorEmail ?? log.actorId ?? "—"}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p
                      className="truncate text-sm text-[#f4f4f6]"
                      title={ACTION_LABEL[log.action]}
                    >
                      {ACTION_LABEL[log.action]}
                    </p>
                    <p className="font-mono text-xs text-[#606072]">
                      {log.action}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm text-[#f4f4f6]">{log.entityType}</p>
                    <p
                      className="truncate font-mono text-xs text-[#606072]"
                      title={log.entityId ?? undefined}
                    >
                      {log.entityId ?? "—"}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs text-[#9898aa]">{log.method ?? "—"}</p>
                    <p
                      className="truncate font-mono text-xs text-[#606072]"
                      title={log.path ?? undefined}
                    >
                      {log.path ?? "—"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {statusBadge(log.success, log.errorCode)}
                    {log.ip && (
                      <span className="truncate text-xs text-[#606072]" title={log.ip}>
                        {log.ip}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-end">
                    <button
                      onClick={() => setDetailId(log.id)}
                      className="cursor-pointer rounded-md p-2 text-[#606072] transition-colors hover:bg-[#1c1c28] hover:text-[#8b5cf6]"
                      aria-label="Xem chi tiết audit log"
                      title="Xem chi tiết"
                    >
                      <Eye size={15} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {!loading && data.total > 0 && (
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(value) => {
              setLimit(value);
              setPage(1);
            }}
          />
        )}
      </div>

      <AuditLogDetailModal logId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

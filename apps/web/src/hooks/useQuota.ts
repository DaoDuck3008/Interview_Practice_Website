"use client";

import { useCallback, useEffect, useState } from "react";
import { getQuotaStatus, type QuotaStatus } from "@/lib/api/quota";

/** Theo dõi hạn mức luyện tập của user; gọi refresh() sau khi dùng 1 lượt. */
export function useQuota() {
  const [status, setStatus] = useState<QuotaStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setStatus(await getQuotaStatus());
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
  }, [refresh]);

  return { status, loading, refresh };
}

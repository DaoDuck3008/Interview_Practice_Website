"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { refreshApi } from "@/lib/api/auth";

export default function AuthHydrator({
  children,
}: {
  children: React.ReactNode;
}) {
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const setHydrated = useAuthStore((s) => s.setHydrated);
  const hasSession = useAuthStore((s) => s.hasSession);

  useEffect(() => {
    const hydrate = async () => {
      // Nếu không có session flag trong localStorage, bỏ qua việc gọi refresh api
      if (!hasSession) {
        setHydrated();
        return;
      }

      try {
        const { accessToken, user } = await refreshApi();

        setAuth(accessToken, user);
      } catch {
        clearAuth();
      } finally {
        // đánh dấu đã hydrate xong
        setHydrated();
      }
    };

    hydrate();
  }, [hasSession]);

  return <>{children}</>;
}

"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { useAiCreditsStore } from "@/stores/aiCredits.store";
import { useFavoritesStore } from "@/stores/favorites.store";
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
  const ensureAiCreditBalance = useAiCreditsStore((s) => s.ensureBalance);
  const ensureAiCreditPricing = useAiCreditsStore((s) => s.ensurePricing);
  const resetAiCredits = useAiCreditsStore((s) => s.reset);
  const fetchFavorites = useFavoritesStore((s) => s.fetchAll);
  const resetFavorites = useFavoritesStore((s) => s.reset);

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
        void ensureAiCreditBalance().catch(() => undefined);
        void ensureAiCreditPricing().catch(() => undefined);
        fetchFavorites();
      } catch {
        clearAuth();
        resetAiCredits();
        resetFavorites();
      } finally {
        // đánh dấu đã hydrate xong
        setHydrated();
      }
    };

    hydrate();
  }, [
    clearAuth,
    fetchFavorites,
    hasSession,
    ensureAiCreditBalance,
    ensureAiCreditPricing,
    resetAiCredits,
    resetFavorites,
    setAuth,
    setHydrated,
  ]);

  return <>{children}</>;
}

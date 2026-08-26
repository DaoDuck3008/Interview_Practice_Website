"use client";

import { useEffect } from "react";
import { useAiCreditsStore } from "@/stores/aiCredits.store";

export function useAiCredits(refreshKey?: string) {
  const balance = useAiCreditsStore((state) => state.balance);
  const pricing = useAiCreditsStore((state) => state.pricing);
  const loading = useAiCreditsStore((state) => state.loading);
  const refresh = useAiCreditsStore((state) => state.refresh);

  useEffect(() => {
    void refresh().catch(() => undefined);
  }, [refresh, refreshKey]);

  return { balance, pricing, loading, refresh };
}

"use client";

import { useEffect } from "react";
import { useAiCreditsStore } from "@/stores/aiCredits.store";

interface UseAiCreditsOptions {
  loadBalance?: boolean;
}

export function useAiCredits(
  { loadBalance = false }: UseAiCreditsOptions = {},
) {
  const balance = useAiCreditsStore((state) => state.balance);
  const balanceLoading = useAiCreditsStore((state) => state.balanceLoading);
  const ensureBalance = useAiCreditsStore((state) => state.ensureBalance);

  useEffect(() => {
    if (loadBalance) void ensureBalance().catch(() => undefined);
  }, [ensureBalance, loadBalance]);

  return {
    balance,
    balanceLoading,
  };
}

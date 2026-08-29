"use client";

import { useEffect } from "react";
import { useAiCreditsStore } from "@/stores/aiCredits.store";

interface UseAiCreditsOptions {
  loadBalance?: boolean;
  loadPricing?: boolean;
}

export function useAiCredits({
  loadBalance = false,
  loadPricing = false,
}: UseAiCreditsOptions = {}) {
  const balance = useAiCreditsStore((state) => state.balance);
  const pricing = useAiCreditsStore((state) => state.pricing);
  const balanceLoading = useAiCreditsStore((state) => state.balanceLoading);
  const pricingLoading = useAiCreditsStore((state) => state.pricingLoading);
  const ensureBalance = useAiCreditsStore((state) => state.ensureBalance);
  const refreshBalance = useAiCreditsStore((state) => state.refreshBalance);
  const ensurePricing = useAiCreditsStore((state) => state.ensurePricing);

  useEffect(() => {
    if (loadBalance) void ensureBalance().catch(() => undefined);
    if (loadPricing) void ensurePricing().catch(() => undefined);
  }, [ensureBalance, ensurePricing, loadBalance, loadPricing]);

  return {
    balance,
    pricing,
    balanceLoading,
    pricingLoading,
    refreshBalance,
  };
}

import { create } from "zustand";
import {
  getAiCreditBalance,
  getAiCreditPricing,
  type AiCreditBalance,
  type AiCreditPricing,
} from "@/lib/api/aiCredits";

interface AiCreditsStore {
  balance: AiCreditBalance | null;
  pricing: AiCreditPricing | null;
  loading: boolean;
  refresh(): Promise<void>;
  reset(): void;
}

let refreshPromise: Promise<void> | null = null;
let refreshGeneration = 0;

export const useAiCreditsStore = create<AiCreditsStore>()((set) => ({
  balance: null,
  pricing: null,
  loading: false,

  refresh: async () => {
    if (refreshPromise) return refreshPromise;

    const generation = refreshGeneration;
    set({ loading: true });
    const request = Promise.all([
      getAiCreditBalance(),
      getAiCreditPricing(),
    ])
      .then(([balance, pricing]) => {
        if (generation === refreshGeneration) set({ balance, pricing });
      })
      .finally(() => {
        if (refreshPromise === request) {
          set({ loading: false });
          refreshPromise = null;
        }
      });
    refreshPromise = request;
    return request;
  },

  reset: () => {
    refreshGeneration += 1;
    refreshPromise = null;
    set({ balance: null, pricing: null, loading: false });
  },
}));

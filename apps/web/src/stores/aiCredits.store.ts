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
  balanceLoading: boolean;
  pricingLoading: boolean;
  ensureBalance(): Promise<void>;
  refreshBalance(): Promise<void>;
  ensurePricing(): Promise<void>;
  reset(): void;
}

let balanceRequest: Promise<void> | null = null;
let pricingRequest: Promise<void> | null = null;
let requestGeneration = 0;

export const useAiCreditsStore = create<AiCreditsStore>()((set, get) => ({
  balance: null,
  pricing: null,
  balanceLoading: false,
  pricingLoading: false,

  ensureBalance: async () => {
    if (get().balance) return;
    return get().refreshBalance();
  },

  refreshBalance: async () => {
    if (balanceRequest) return balanceRequest;

    const generation = requestGeneration;
    set({ balanceLoading: true });
    const request = getAiCreditBalance()
      .then((balance) => {
        if (generation === requestGeneration) set({ balance });
      })
      .finally(() => {
        if (balanceRequest === request) {
          set({ balanceLoading: false });
          balanceRequest = null;
        }
      });
    balanceRequest = request;
    return request;
  },

  ensurePricing: async () => {
    if (get().pricing || pricingRequest) {
      return pricingRequest ?? Promise.resolve();
    }

    const generation = requestGeneration;
    set({ pricingLoading: true });
    const request = getAiCreditPricing()
      .then((pricing) => {
        if (generation === requestGeneration) set({ pricing });
      })
      .finally(() => {
        if (pricingRequest === request) {
          set({ pricingLoading: false });
          pricingRequest = null;
        }
      });
    pricingRequest = request;
    return request;
  },

  reset: () => {
    requestGeneration += 1;
    balanceRequest = null;
    pricingRequest = null;
    set({
      balance: null,
      pricing: null,
      balanceLoading: false,
      pricingLoading: false,
    });
  },
}));

import { create } from "zustand";
import {
  getAiCreditBalance,
  type AiCreditBalance,
} from "@/lib/api/aiCredits";

interface AiCreditsStore {
  balance: AiCreditBalance | null;
  balanceLoading: boolean;
  ensureBalance(): Promise<void>;
  reset(): void;
}

let balanceRequest: Promise<void> | null = null;
let requestGeneration = 0;

export const useAiCreditsStore = create<AiCreditsStore>()((set, get) => ({
  balance: null,
  balanceLoading: false,

  ensureBalance: async () => {
    if (get().balance || balanceRequest) {
      return balanceRequest ?? Promise.resolve();
    }

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

  reset: () => {
    requestGeneration += 1;
    balanceRequest = null;
    set({
      balance: null,
      balanceLoading: false,
    });
  },
}));

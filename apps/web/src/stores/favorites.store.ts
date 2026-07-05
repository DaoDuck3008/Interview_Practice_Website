import { create } from "zustand";
import { toast } from "react-toastify";
import {
  addFavorite,
  getFavoriteIds,
  getRecentFavorites,
  removeFavorite,
  type FavoriteQuestion,
} from "@/lib/api/favorites";
import type { Question } from "@/lib/api/questions";

const RECENT_LIMIT = 8;

interface FavoritesStore {
  ids: Set<string>;
  recent: FavoriteQuestion[];
  loading: boolean;
  fetchAll(): Promise<void>;
  toggleFavorite(question: Question): Promise<void>;
  reset(): void;
}

export const useFavoritesStore = create<FavoritesStore>()((set, get) => ({
  ids: new Set(),
  recent: [],
  loading: false,

  fetchAll: async () => {
    set({ loading: true });
    try {
      const [ids, recent] = await Promise.all([
        getFavoriteIds(),
        getRecentFavorites(RECENT_LIMIT),
      ]);
      set({ ids: new Set(ids), recent });
    } finally {
      set({ loading: false });
    }
  },

  toggleFavorite: async (question) => {
    const { ids, recent } = get();
    const wasFavorited = ids.has(question.id);

    // Cập nhật lạc quan trước, revert nếu API lỗi.
    const nextIds = new Set(ids);
    let nextRecent = recent;
    if (wasFavorited) {
      nextIds.delete(question.id);
      nextRecent = recent.filter((q) => q.id !== question.id);
    } else {
      nextIds.add(question.id);
      nextRecent = [
        { ...question, favoritedAt: new Date().toISOString() },
        ...recent,
      ].slice(0, RECENT_LIMIT);
    }
    set({ ids: nextIds, recent: nextRecent });

    try {
      if (wasFavorited) await removeFavorite(question.id);
      else await addFavorite(question.id);
    } catch {
      set({ ids, recent });
      toast.error("Không thể cập nhật câu hỏi yêu thích. Vui lòng thử lại.");
    }
  },

  reset: () => set({ ids: new Set(), recent: [], loading: false }),
}));

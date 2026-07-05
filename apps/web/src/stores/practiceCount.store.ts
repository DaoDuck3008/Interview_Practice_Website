import { create } from "zustand";
import { getQuotaStatus } from "@/lib/api/quota";

interface PracticeCountStore {
  /** Số câu đã luyện hôm nay (giờ VN). */
  count: number;
  loading: boolean;
  refresh(): Promise<void>;
}

export const usePracticeCountStore = create<PracticeCountStore>()((set) => ({
  count: 0,
  loading: false,

  refresh: async () => {
    set({ loading: true });
    try {
      const status = await getQuotaStatus();
      set({ count: status.todayCount });
    } catch {
      // Giữ nguyên giá trị cũ nếu lỗi — không reset về 0 chỉ vì 1 lần gọi thất bại.
    } finally {
      set({ loading: false });
    }
  },
}));

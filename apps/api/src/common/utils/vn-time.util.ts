// Việt Nam cố định UTC+7 (không DST) — dùng để quy đổi mốc thời gian lưu UTC
// sang ranh giới ngày/tuần/tháng theo giờ VN cho các query dạng "hôm nay/tuần này/tháng này".
export const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;

/** 'YYYY-MM-DD' của một thời điểm, quy theo giờ VN. */
export function vnDayKey(d: Date): string {
  const vn = new Date(d.getTime() + VN_OFFSET_MS);
  return `${vn.getUTCFullYear()}-${String(vn.getUTCMonth() + 1).padStart(2, '0')}-${String(vn.getUTCDate()).padStart(2, '0')}`;
}

/** Mốc 00:00 (giờ VN) của ngày chứa `d`, quy về Date UTC để so với cột lưu UTC. */
export function vnStartOfDay(d: Date = new Date()): Date {
  const vn = new Date(d.getTime() + VN_OFFSET_MS);
  return new Date(
    Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate()) -
      VN_OFFSET_MS,
  );
}

/** Mốc Thứ Hai 00:00 (giờ VN) của tuần chứa `d`. */
export function vnStartOfWeek(d: Date = new Date()): Date {
  const vn = new Date(d.getTime() + VN_OFFSET_MS);
  // getUTCDay: 0 = CN … 6 = T7 → số ngày đã trôi qua kể từ Thứ Hai.
  const daysSinceMonday = (vn.getUTCDay() + 6) % 7;
  return new Date(vnStartOfDay(d).getTime() - daysSinceMonday * DAY_MS);
}

/** Mốc ngày 1 đầu tháng, 00:00 (giờ VN) của tháng chứa `d`. */
export function vnStartOfMonth(d: Date = new Date()): Date {
  const vn = new Date(d.getTime() + VN_OFFSET_MS);
  return new Date(
    Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), 1) - VN_OFFSET_MS,
  );
}

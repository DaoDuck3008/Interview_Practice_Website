const VN_TZ = "Asia/Ho_Chi_Minh";

/** Định dạng datetime đầy đủ (dd/mm/yyyy hh:mm) theo giờ Việt Nam. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    timeZone: VN_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Định dạng ngày (dd/mm/yyyy) theo giờ Việt Nam. Trả "—" nếu null. */
export function formatDay(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN", { timeZone: VN_TZ });
}

/** Định dạng datetime đầy đủ với giây (dd/mm/yyyy hh:mm:ss) theo giờ Việt Nam. Trả "—" nếu null. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", {
    timeZone: VN_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Giờ:phút theo giờ Việt Nam (vd "14:05") — dùng cho tin nhắn chat. */
export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString("vi-VN", {
    timeZone: VN_TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Nhóm chữ số theo định dạng VN, không kèm ký hiệu (vd "50.000"). */
export function formatNumber(value: number): string {
  return value.toLocaleString("vi-VN");
}

/** Định dạng số tiền VND kèm ký hiệu "đ" (vd "50.000đ"). */
export function formatVnd(amount: number): string {
  return `${formatNumber(amount)}đ`;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Tổng thời gian dài dạng "9h 30m" / "45m" / "0m" (dùng cho số liệu tổng). */
export function formatHoursMinutes(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

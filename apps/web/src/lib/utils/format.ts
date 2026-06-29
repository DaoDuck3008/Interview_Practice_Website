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

/** Định dạng ngày giờ theo giờ Việt Nam (UTC+7) — dùng cho nội dung email. */
export function formatDateVn(d: Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(d);
}

/** 1290000 → "1.290.000₫" */
export function formatVnd(amount: number): string {
  return amount.toLocaleString('vi-VN') + '₫';
}

/** Escape các ký tự đặc biệt HTML — dùng khi nội dung email chèn giá trị do user nhập. */
export function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[c] ?? c,
  );
}

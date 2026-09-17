/**
 * Chỉ cho phép điều hướng về route nội bộ. Query `redirect` là dữ liệu do
 * người dùng kiểm soát nên không được truyền thẳng vào router hoặc location.
 */
export function safeRedirectPath(
  value: string | null | undefined,
  fallback: string,
): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  try {
    const base = "https://interview-practice.local";
    const target = new URL(value, base);
    if (target.origin !== base) return fallback;

    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return fallback;
  }
}

export function resolveClientIp(
  headers: Record<string, string | string[] | undefined>,
  fallback?: string,
) {
  // Cloudflare set header này thành IP visitor gốc khi request đi qua
  // Tunnel/proxy tới backend.
  const cfIp = firstHeader(headers['cf-connecting-ip']);
  if (cfIp) return cfIp;

  // Định dạng proxy chain chuẩn: client, proxy1, proxy2. IP bên trái nhất là
  // client gốc cho mục đích rate limit.
  const forwardedFor = firstHeader(headers['x-forwarded-for']);
  if (forwardedFor) {
    const firstIp = forwardedFor
      .split(',')
      .map((part) => part.trim())
      .find(Boolean);
    if (firstIp) return firstIp;
  }

  return fallback ?? 'unknown';
}

function firstHeader(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

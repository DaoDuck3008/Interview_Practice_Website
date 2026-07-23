import type { NextConfig } from "next";

// Helper function: lọc bỏ các giá trị undefined và loại bỏ các giá trị trùng lặp trong mảng
function unique(values: Array<string | undefined>) {
  return [...new Set(values.filter(Boolean))];
}

// Helper function: lấy origin từ URL, nếu không hợp lệ thì trả về fallback
function originOf(url: string | undefined, fallback: string) {
  try {
    return new URL(url ?? fallback).origin;
  } catch {
    return new URL(fallback).origin;
  }
}

// Helper function: chuyển đổi origin HTTP sang origin WebSocket
function websocketOrigin(httpOrigin: string) {
  if (httpOrigin.startsWith("https://")) {
    return `wss://${httpOrigin.slice("https://".length)}`;
  }
  if (httpOrigin.startsWith("http://")) {
    return `ws://${httpOrigin.slice("http://".length)}`;
  }
  return httpOrigin;
}

// Chuyển một URL public thành remotePattern cho next/image. Các URL không hợp lệ
// được bỏ qua để cấu hình vẫn chạy tốt ở môi trường local chưa khai báo đủ biến.
function imagePatternFromUrl(url: string | undefined) {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    return {
      protocol: parsed.protocol.replace(":", "") as "http" | "https",
      hostname: parsed.hostname,
      port: parsed.port,
      pathname: "/**",
    };
  } catch {
    return undefined;
  }
}

const isProduction = process.env.NODE_ENV === "production";
const apiOrigin = originOf(
  process.env.NEXT_PUBLIC_API_URL,
  "http://localhost:3001/api/v1",
);
const wsOrigin = websocketOrigin(apiOrigin);
const remoteImagePatterns = unique([
  process.env.NEXT_PUBLIC_R2_PUBLIC_URL,
  process.env.R2_PUBLIC_URL,
])
  .map(imagePatternFromUrl)
  .filter((pattern): pattern is NonNullable<typeof pattern> => Boolean(pattern));

// Danh sách các nguồn được phép trong Content Security Policy (CSP)
const scriptSrc = unique([
  "'self'",
  "'unsafe-inline'",
  isProduction ? undefined : "'unsafe-eval'",
  "https://accounts.google.com",
  "https://apis.google.com",
]);

const scriptSrcElem = unique([
  ...scriptSrc,
  "https://static.cloudflareinsights.com",
]);

const styleSrc = unique([
  "'self'",
  "'unsafe-inline'",
  "https://fonts.googleapis.com",
  "https://accounts.google.com",
]);

// Danh sách các nguồn được phép trong Content Security Policy (CSP) cho connect-src
const connectSrc = unique([
  "'self'",
  apiOrigin,
  wsOrigin,
  "https://accounts.google.com",
  "https://cloudflareinsights.com",
]);

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  `script-src ${scriptSrc.join(" ")}`,
  `script-src-elem ${scriptSrcElem.join(" ")}`,
  `style-src ${styleSrc.join(" ")}`,
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  `connect-src ${connectSrc.join(" ")}`,
  "frame-src https://accounts.google.com",
  "media-src 'self' data: blob: https:",
  "worker-src 'self' blob:",
  isProduction ? "upgrade-insecure-requests" : "",
]
  .filter(Boolean)
  .join("; ");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["daoduck.id.vn", "backend.daoduck.id.vn"],
  images: {
    remotePatterns: [
      ...remoteImagePatterns,
      // Avatar Google OAuth.
      { protocol: "https", hostname: "**.googleusercontent.com" },
      // QR thanh toán Sepay.
      { protocol: "https", hostname: "qr.sepay.vn", pathname: "/img" },
      // Ảnh Open Graph/Cloudinary nếu sau này render trực tiếp trong UI.
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
      // Cloudflare R2 public bucket mặc định; custom domain vẫn nên khai báo qua env ở trên.
      { protocol: "https", hostname: "**.r2.dev", pathname: "/**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value:
              "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), payment=(), usb=()",
          },
          ...(isProduction
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains; preload",
                },
              ]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;

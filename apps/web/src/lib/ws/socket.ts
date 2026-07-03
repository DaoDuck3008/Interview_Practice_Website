import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

/** Origin thuần (bỏ path /api/v1) — namespace /ws không nằm dưới global prefix HTTP. */
function socketOrigin(): string {
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
  return apiUrl.replace(/\/api\/v1\/?$/, "");
}

/** Kết nối (hoặc thay thế kết nối cũ) với access token hiện tại. */
export function connectSocket(token: string): Socket {
  if (socket) {
    socket.disconnect();
  }
  socket = io(`${socketOrigin()}/ws`, {
    auth: { token },
  });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function getSocket(): Socket | null {
  return socket;
}

/**
 * Đợi 1 trong các `events` khớp `predicate`, tối đa `timeoutMs`. Trả `null`
 * nếu hết giờ (không phải lỗi — timeout là tín hiệu "kiểm tra lại sau", không
 * phải thất bại cứng). Dùng cho luồng score/improve chạy qua hàng đợi.
 */
export function waitForEvent<T = unknown>(
  target: Socket,
  events: string[],
  predicate: (event: string, payload: T) => boolean,
  timeoutMs: number,
): Promise<{ event: string; payload: T } | null> {
  return new Promise((resolve) => {
    const handlers = new Map<string, (payload: T) => void>();

    const cleanup = () => {
      clearTimeout(timer);
      for (const [event, handler] of handlers) target.off(event, handler);
    };

    const timer = setTimeout(() => {
      cleanup();
      resolve(null);
    }, timeoutMs);

    for (const event of events) {
      const handler = (payload: T) => {
        if (!predicate(event, payload)) return;
        cleanup();
        resolve({ event, payload });
      };
      handlers.set(event, handler);
      target.on(event, handler);
    }
  });
}

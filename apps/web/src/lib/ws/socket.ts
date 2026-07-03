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

import { getSocket } from "@/lib/ws/socket";

/** Truy cập instance socket.io hiện tại (vòng đời do SocketProvider quản lý). */
export function useSocket() {
  return getSocket();
}

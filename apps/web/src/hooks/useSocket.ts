import { useSyncExternalStore } from "react";
import { getSocket, subscribeSocket } from "@/lib/ws/socket";

/** Truy cập instance socket.io hiện tại (vòng đời do SocketProvider quản lý). */
export function useSocket() {
  return useSyncExternalStore(subscribeSocket, getSocket, () => null);
}

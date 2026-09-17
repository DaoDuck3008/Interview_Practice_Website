"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { connectSocket, disconnectSocket } from "@/lib/ws/socket";
import { refreshApi } from "@/lib/api/auth";

/**
 * Quản lý vòng đời kết nối WebSocket theo trạng thái đăng nhập: kết nối khi có
 * access token, ngắt khi logout, tự nối lại với token mới khi token đổi (vd
 * sau khi refresh 15 phút).
 */
export default function SocketProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const accessToken = useAuthStore((s) => s.access_token);
  const hydrated = useAuthStore((s) => s.hydrated);
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  useEffect(() => {
    if (!hydrated || !accessToken) {
      disconnectSocket();
      return;
    }

    const socket = connectSocket(accessToken);
    let refreshing = false;

    const refreshSocketAuth = async () => {
      if (refreshing) return;
      refreshing = true;
      try {
        const refreshed = await refreshApi();
        setAuth(refreshed.accessToken, refreshed.user);
      } catch {
        clearAuth();
      }
    };
    const revokeSocketAuth = () => clearAuth();

    socket.on("auth:expired", refreshSocketAuth);
    socket.on("auth:revoked", revokeSocketAuth);

    return () => {
      socket.off("auth:expired", refreshSocketAuth);
      socket.off("auth:revoked", revokeSocketAuth);
      disconnectSocket();
    };
  }, [accessToken, clearAuth, hydrated, setAuth]);

  return <>{children}</>;
}

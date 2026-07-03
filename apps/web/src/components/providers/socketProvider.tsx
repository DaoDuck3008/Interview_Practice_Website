"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { connectSocket, disconnectSocket } from "@/lib/ws/socket";

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

  useEffect(() => {
    if (!hydrated || !accessToken) {
      disconnectSocket();
      return;
    }

    connectSocket(accessToken);

    return () => {
      disconnectSocket();
    };
  }, [accessToken, hydrated]);

  return <>{children}</>;
}

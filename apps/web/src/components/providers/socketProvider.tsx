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

    const socket = connectSocket(accessToken);

    // Kiểm tra tạm thời hạ tầng WebSocket (giai đoạn 1) — gỡ khi nối BullMQ.
    if (process.env.NODE_ENV !== "production") {
      socket.on("connect", () => {
        socket.emit("ping", (response: string) => {
          console.log("[ws] ping ->", response);
        });
      });
    }

    return () => {
      disconnectSocket();
    };
  }, [accessToken, hydrated]);

  return <>{children}</>;
}

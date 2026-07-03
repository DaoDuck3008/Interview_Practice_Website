import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

/**
 * Kênh WebSocket đẩy thông báo realtime cho user (vd: kết quả chấm điểm AI khi
 * xử lý xong ở hàng đợi). Xác thực qua `handshake.auth.token` (access token JWT
 * hiện có) thay vì cookie/header — vì socket.io hỗ trợ gửi token sạch lúc
 * connect, không vướng giới hạn "không set được header" như SSE.
 */
@WebSocketGateway({ namespace: '/ws' })
export class WebsocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebsocketGateway.name);

  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.config.getOrThrow<string>('jwt.accessSecret'),
      });
      // Room theo user — 1 user có thể có nhiều tab/kết nối, tất cả đều nhận
      // được event khi emitToUser gọi tới đúng room này.
      await client.join(`user:${payload.sub}`);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(_client: Socket) {
    // socket.io tự rời khỏi mọi room khi disconnect — không cần dọn thủ công.
  }

  /** Handler test — kiểm chứng round-trip lúc dựng hạ tầng. Gỡ sau giai đoạn 2. */
  @SubscribeMessage('ping')
  handlePing(): string {
    return 'pong';
  }

  /** Đẩy 1 event tới mọi kết nối (mọi tab) đang mở của 1 user. */
  emitToUser(userId: string, event: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }
}

import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SupportService } from '../modules/support/support.service';
import { RedisThrottlerStorage } from '../common/throttling/redis-throttler.storage';
import { WS_SUPPORT_LIMIT } from '../common/throttling/throttle-profiles';
import { resolveClientIp } from '../common/throttling/throttling.util';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

interface SupportSendPayload {
  content?: string;
  /** URL ảnh đã upload lên R2 (qua POST /support/upload) — tùy chọn. */
  imageUrl?: string;
  /** Bắt buộc khi người gửi là ADMIN — chỉ định trả lời thread của user nào. */
  targetUserId?: string;
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
    private support: SupportService,
    // Dùng lại counter Redis giống HTTP throttling. Event WebSocket không có
    // req/res object, nên gateway gọi thẳng storage.
    private throttlerStorage: RedisThrottlerStorage,
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
      client.data.userId = payload.sub;
      client.data.role = payload.role;
      // Room theo user — 1 user có thể có nhiều tab/kết nối, tất cả đều nhận
      // được event khi emitToUser gọi tới đúng room này.
      await client.join(`user:${payload.sub}`);
      // Admin join thêm room chung — nhận realtime mọi tin nhắn hỗ trợ, dù của user nào.
      if (payload.role === 'ADMIN') {
        await client.join('admin');
      }
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(_client: Socket) {
    // socket.io tự rời khỏi mọi room khi disconnect — không cần dọn thủ công.
  }

  /** Đẩy 1 event tới mọi kết nối (mọi tab) đang mở của 1 user. */
  emitToUser(userId: string, event: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  /**
   * Tin nhắn hỗ trợ: user gửi cho admin (thread = chính họ), hoặc admin trả
   * lời 1 user cụ thể (thread = `targetUserId`). Lưu DB rồi đẩy realtime tới
   * đúng user + mọi admin đang online.
   */
  @SubscribeMessage('support:send')
  async handleSupportSend(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SupportSendPayload,
  ) {
    // Dùng cùng logic lấy IP sau proxy như HTTP. Kết hợp userId + IP để một
    // user ở các mạng khác nhau có bucket riêng, đồng thời vẫn chặn được burst
    // từ cùng một kết nối.
    const tracker = resolveClientIp(
      client.handshake.headers as Record<string, string | string[] | undefined>,
      client.handshake.address,
    );
    const rateLimitKey = `${client.data.userId}:${tracker}`;

    // support:send không phải HTTP route nên APP_GUARD/@Throttle không chạy ở
    // đây. Tăng counter Redis thủ công để không hở lỗ spam chat.
    const rateLimit = await this.throttlerStorage.increment(
      rateLimitKey,
      WS_SUPPORT_LIMIT.ttl,
      WS_SUPPORT_LIMIT.limit,
      WS_SUPPORT_LIMIT.blockDuration,
      WS_SUPPORT_LIMIT.throttlerName,
    );
    if (rateLimit.isBlocked) {
      // Emit event nghiệp vụ thay vì throw exception; frontend đã lắng nghe
      // support event và có thể hiện toast mà không cần reconnect socket.
      client.emit(
        'support:error',
        'Bạn gửi tin nhắn quá nhanh. Vui lòng chờ một chút rồi thử lại.',
      );
      return;
    }

    const content = data?.content?.trim() ?? '';
    if (content.length > 2000) return;

    // Chỉ chấp nhận imageUrl trỏ vào chính bucket R2 của mình (đã upload qua
    // POST /support/upload) — chặn client chèn URL ảnh tùy ý từ nơi khác.
    const publicUrl = this.config
      .getOrThrow<string>('r2.publicUrl')
      .replace(/\/$/, '');
    const imageUrl =
      data.imageUrl && data.imageUrl.startsWith(`${publicUrl}/`)
        ? data.imageUrl
        : undefined;

    // Tin phải có ít nhất text hoặc ảnh.
    if (!content && !imageUrl) return;

    const isAdmin = client.data.role === 'ADMIN';
    const threadUserId = isAdmin ? data.targetUserId : client.data.userId;
    if (!threadUserId) return;

    const message = await this.support.createMessage(
      threadUserId,
      isAdmin ? 'ADMIN' : 'USER',
      content,
      imageUrl,
    );

    this.server.to(`user:${threadUserId}`).emit('support:message', message);
    this.server.to('admin').emit('support:message', message);
  }
}

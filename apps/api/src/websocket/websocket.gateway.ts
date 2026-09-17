import {
  Inject,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
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
import { Redis } from 'ioredis';
import { Server, Socket } from 'socket.io';
import { SupportService } from '../modules/support/support.service';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import { RedisThrottlerStorage } from '../common/throttling/redis-throttler.storage';
import { WS_SUPPORT_LIMIT } from '../common/throttling/throttle-profiles';
import { resolveClientIp } from '../common/throttling/throttling.util';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  exp: number;
}

interface SocketRevocation {
  userId: string;
  reason: string;
}

const SOCKET_REVOCATION_CHANNEL = 'websocket:auth:revoke';

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
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnApplicationShutdown
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebsocketGateway.name);
  private readonly expirationTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private subscriber?: Redis;

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly support: SupportService,
    // Dùng lại counter Redis giống HTTP throttling. Event WebSocket không có
    // req/res object, nên gateway gọi thẳng storage.
    private readonly throttlerStorage: RedisThrottlerStorage,
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async onModuleInit() {
    this.subscriber = this.redis.duplicate();
    this.subscriber.on('message', (channel, message) => {
      if (channel !== SOCKET_REVOCATION_CHANNEL) return;
      this.handleRevocationMessage(message);
    });
    this.subscriber.on('error', (error) =>
      this.logger.error(`Lỗi Redis subscriber WebSocket: ${error.message}`),
    );

    try {
      await this.subscriber.subscribe(SOCKET_REVOCATION_CHANNEL);
    } catch (error) {
      this.logger.error(
        `Không thể subscribe revoke WebSocket: ${String(error)}`,
      );
    }
  }

  async onApplicationShutdown() {
    for (const timer of this.expirationTimers.values()) clearTimeout(timer);
    this.expirationTimers.clear();
    if (this.subscriber) await this.subscriber.quit();
  }

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
      if (!Number.isSafeInteger(payload.exp)) throw new Error('JWT thiếu exp');

      const user = await this.findActiveUser(payload.sub);
      if (!user) throw new Error('User không còn hoạt động');

      client.data.userId = user.id;
      client.data.role = user.role;
      client.data.tokenExpiresAt = payload.exp;
      await this.syncRooms(client, user.id, user.role);
      this.scheduleExpiration(client, payload.exp);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const timer = this.expirationTimers.get(client.id);
    if (timer) clearTimeout(timer);
    this.expirationTimers.delete(client.id);
    // socket.io tự rời khỏi mọi room khi disconnect — không cần dọn thủ công.
  }

  /** Đẩy 1 event tới mọi kết nối (mọi tab) đang mở của 1 user. */
  emitToUser(userId: string, event: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  /** Thu hồi ngay các socket của user trên mọi API instance. */
  async revokeUserSessions(userId: string, reason: string) {
    this.disconnectUserSockets(userId, reason);
    try {
      await this.redis.publish(
        SOCKET_REVOCATION_CHANNEL,
        JSON.stringify({ userId, reason } satisfies SocketRevocation),
      );
    } catch (error) {
      this.logger.error(
        `Không publish được revoke WebSocket cho user ${userId}: ${String(error)}`,
      );
    }
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
    const user = await this.revalidateClient(client);
    if (!user) return;

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

    const isAdmin = user.role === Role.ADMIN;
    const socketUserId = client.data.userId;
    const threadUserId = isAdmin
      ? data.targetUserId
      : typeof socketUserId === 'string'
        ? socketUserId
        : undefined;
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

  private async revalidateClient(client: Socket) {
    const userId = client.data.userId as string | undefined;
    if (!userId) {
      client.disconnect(true);
      return null;
    }

    const user = await this.findActiveUser(userId);
    if (!user) {
      this.disconnectClient(client, 'access_revoked');
      return null;
    }

    if (client.data.role !== user.role) {
      client.data.role = user.role;
      await this.syncRooms(client, user.id, user.role);
    }
    return user;
  }

  private async findActiveUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, isLock: true },
    });
    return user && !user.isLock ? user : null;
  }

  private async syncRooms(client: Socket, userId: string, role: Role) {
    await client.join(`user:${userId}`);
    if (role === Role.ADMIN) {
      await client.join('admin');
    } else {
      await client.leave('admin');
    }
  }

  private scheduleExpiration(client: Socket, exp: number) {
    const delay = exp * 1000 - Date.now();
    if (delay <= 0) {
      this.disconnectClient(client, 'token_expired');
      return;
    }

    const timer = setTimeout(() => {
      this.expirationTimers.delete(client.id);
      this.disconnectClient(client, 'token_expired');
    }, delay);
    this.expirationTimers.set(client.id, timer);
  }

  private handleRevocationMessage(message: string) {
    try {
      const parsed = JSON.parse(message) as Partial<SocketRevocation>;
      if (typeof parsed.userId !== 'string' || typeof parsed.reason !== 'string')
        return;
      this.disconnectUserSockets(parsed.userId, parsed.reason);
    } catch {
      this.logger.warn('Nhận revoke WebSocket không hợp lệ.');
    }
  }

  private disconnectUserSockets(userId: string, reason: string) {
    if (!this.server) return;
    const room = `user:${userId}`;
    this.server.to(room).emit('auth:revoked', { reason });
    this.server.in(room).disconnectSockets(true);
  }

  private disconnectClient(client: Socket, reason: string) {
    client.emit(reason === 'token_expired' ? 'auth:expired' : 'auth:revoked', {
      reason,
    });
    client.disconnect(true);
  }
}

import { ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
  type ThrottlerLimitDetail,
  type ThrottlerModuleOptions,
  type ThrottlerStorage,
} from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { resolveClientIp } from './throttling.util';
import { USER_ACTION_THROTTLE } from './user-action-throttle.decorator';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions()
    options: ThrottlerModuleOptions,
    @InjectThrottlerStorage()
    storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly config: ConfigService,
  ) {
    super(options, storageService, reflector);
  }

  protected async shouldSkip(context: ExecutionContext) {
    // APP_GUARD cũng thấy context WebSocket; support chat được limit thủ công
    // trong gateway vì ở đó không có HTTP request/response object của Nest.
    if (context.getType<'http' | 'ws' | 'rpc'>() !== 'http') return true;

    // Endpoint AI đã có guard theo user chạy sau JwtAuthGuard. Ở development
    // chỉ chạy lớp đó để áp dụng giới hạn nới rộng, tránh IP guard chặn trước.
    const isUserAction = this.reflector.getAllAndOverride<boolean>(
      USER_ACTION_THROTTLE,
      [context.getHandler(), context.getClass()],
    );
    return this.config.get<string>('nodeEnv') === 'development' && isUserAction;
  }

  protected async getTracker(req: Record<string, any>) {
    // Với TRUST_PROXY đúng, Express đã tính req.ip từ proxy đáng tin cậy.
    // Chỉ đọc header trực tiếp như fallback để tránh tin nhầm header giả.
    const headers = req.headers as
      | Record<string, string | string[] | undefined>
      | undefined;
    return req.ip ?? resolveClientIp(headers ?? {});
  }

  protected async getErrorMessage(
    _context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<string> {
    const retryAfterMs = detail.timeToBlockExpire || detail.timeToExpire;
    const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
    return `Bạn thao tác quá nhanh. Vui lòng thử lại sau ${retryAfterSeconds} giây.`;
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    const retryAfterMs = detail.timeToBlockExpire || detail.timeToExpire;
    const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));

    // Thư viện trả thời gian theo mili-giây, còn chuẩn HTTP Retry-After dùng giây.
    context
      .switchToHttp()
      .getResponse<Response>()
      .setHeader('Retry-After', String(retryAfterSeconds));

    await super.throwThrottlingException(context, detail);
  }
}

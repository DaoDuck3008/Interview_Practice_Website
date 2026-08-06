import { ExecutionContext, Injectable } from '@nestjs/common';
import {
  ThrottlerGuard,
  type ThrottlerLimitDetail,
} from '@nestjs/throttler';
import type { Response } from 'express';
import { resolveClientIp } from './throttling.util';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext) {
    // APP_GUARD cũng thấy context WebSocket; support chat được limit thủ công
    // trong gateway vì ở đó không có HTTP request/response object của Nest.
    return context.getType<'http' | 'ws' | 'rpc'>() !== 'http';
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

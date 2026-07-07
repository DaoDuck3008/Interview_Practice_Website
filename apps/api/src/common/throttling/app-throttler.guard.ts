import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
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
    return req.ip ?? resolveClientIp(req.headers ?? {});
  }
}

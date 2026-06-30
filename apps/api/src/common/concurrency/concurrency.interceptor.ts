import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

/** Số request tốn phí được phép chạy song song trên mỗi user. */
const MAX_CONCURRENT_PER_USER = 3;

/**
 * Chặn 1 user gửi quá nhiều request tốn phí (tạo session/STT/chấm điểm/cải thiện)
 * cùng lúc → tránh spike chi phí & tải. Đếm in-flight theo userId trong bộ nhớ;
 * tăng khi vào handler, giảm khi handler kết thúc (thành công hoặc lỗi).
 *
 * Lưu ý: counter nằm trong RAM của tiến trình — đúng cho triển khai 1 instance.
 * Nếu sau này scale nhiều instance cần chuyển sang Redis.
 */
@Injectable()
export class ConcurrencyInterceptor implements NestInterceptor {
  private readonly inFlight = new Map<string, number>();

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context
      .switchToHttp()
      .getRequest<{ user?: { id: string } }>();
    const userId = req.user?.id;
    if (!userId) return next.handle();

    const current = this.inFlight.get(userId) ?? 0;
    if (current >= MAX_CONCURRENT_PER_USER) {
      throw new HttpException(
        'Bạn đang có yêu cầu đang được xử lý. Vui lòng đợi một chút rồi thử lại.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.inFlight.set(userId, current + 1);
    return next.handle().pipe(
      finalize(() => {
        const left = (this.inFlight.get(userId) ?? 1) - 1;
        if (left <= 0) this.inFlight.delete(userId);
        else this.inFlight.set(userId, left);
      }),
    );
  }
}

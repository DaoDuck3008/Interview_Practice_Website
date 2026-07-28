import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { QuotaService } from './quota.service';

/**
 * Chặn endpoint tốn tài nguyên (STT/DeepSeek) khi user đã hết lượt trong kỳ.
 * Chỉ là lớp chặn sớm để không gọi Whisper khi quota đã hết rõ ràng. Service vẫn phải
 * reserve() nguyên tử trước thao tác tốn phí, vì nhiều request song song có thể cùng qua Guard.
 * Phải đặt SAU JwtAuthGuard để có sẵn request.user.
 */
@Injectable()
export class QuotaGuard implements CanActivate {
  constructor(private readonly quota: QuotaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ user?: { id: string } }>();
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('Chưa xác thực.');

    await this.quota.assertWithinLimitFor(userId, 1);
    return true;
  }
}

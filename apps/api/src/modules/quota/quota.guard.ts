import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { QuotaService } from './quota.service';

/**
 * Chặn endpoint tốn tài nguyên (STT/DeepSeek) khi user đã hết lượt trong kỳ.
 * Chỉ KIỂM TRA (ném 429 nếu vượt) — việc tăng đếm do service gọi record() sau khi
 * thao tác thành công. Phải đặt SAU JwtAuthGuard để có sẵn request.user.
 */
@Injectable()
export class QuotaGuard implements CanActivate {
  constructor(private readonly quota: QuotaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ user?: { id: string } }>();
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('Chưa xác thực.');

    await this.quota.assertWithinLimit(userId);
    return true;
  }
}

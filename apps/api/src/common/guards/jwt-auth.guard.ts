import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

// Dùng instance không qua DI — JwtService chỉ wrap jsonwebtoken, không cần module context
const jwtService = new JwtService({});

@Injectable()
export class JwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = extractBearerToken(request);

    if (!token) throw new UnauthorizedException('Vui lòng đăng nhập');

    try {
      const payload = await jwtService.verifyAsync<{
        sub: string;
        email: string;
        role: string;
      }>(token, { secret: process.env.JWT_ACCESS_SECRET });

      request['user'] = { id: payload.sub, email: payload.email, role: payload.role };
    } catch (err: any) {
      if (err?.name === 'TokenExpiredError')
        throw new UnauthorizedException('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
      throw new UnauthorizedException('Access token không hợp lệ');
    }

    return true;
  }
}

function extractBearerToken(request: Request): string | undefined {
  const [type, token] = request.headers.authorization?.split(' ') ?? [];
  return type === 'Bearer' ? token : undefined;
}

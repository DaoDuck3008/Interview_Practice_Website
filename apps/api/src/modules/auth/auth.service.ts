import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenStore } from './refresh-token.store';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
    private refreshStore: RefreshTokenStore,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    // Luôn chạy bcrypt để tránh timing attack (không để lộ email tồn tại qua response time)
    const hash =
      user?.passwordHash ?? '$2b$10$invalidhashfortimingprotectionxx';
    const isMatch = await bcrypt.compare(password, hash);
    return user && isMatch ? user : null;
  }

  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.usersService.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
    });
  }

  async login(user: { id: string; email: string; role: string }) {
    return this.issueTokens(user);
  }

  // Refresh token đã được JwtRefreshStrategy verify chữ ký + hạn dùng ở guard.
  // Ở đây chỉ còn kiểm tra jti có nằm trong allowlist (Redis) không, rồi xoay vòng.
  async refreshTokens(userId: string, jti: string) {
    const isAllowed = await this.refreshStore.exists(userId, jti);
    if (!isAllowed)
      throw new UnauthorizedException(
        'Phiên đăng nhập không hợp lệ, vui lòng đăng nhập lại',
      );

    // Đọc lại user từ DB để role luôn cập nhật
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('Người dùng không tồn tại');

    // Thu hồi jti cũ trước khi cấp jti mới (rotation)
    await this.refreshStore.remove(userId, jti);

    const tokens = await this.issueTokens(user);
    return {
      ...tokens,
      user: { name: user.name, email: user.email, role: user.role },
    };
  }

  // Thu hồi đúng phiên hiện tại: decode refresh token (best-effort, kể cả đã hết hạn)
  // để lấy sub + jti rồi xoá khỏi allowlist. Không verify vì chỉ cần dọn dẹp.
  async logout(refreshToken: string | undefined) {
    if (!refreshToken) return;
    const decoded = this.jwtService.decode(refreshToken) as {
      sub?: string;
      jti?: string;
    } | null;
    if (decoded?.sub && decoded?.jti) {
      await this.refreshStore.remove(decoded.sub, decoded.jti);
    }
  }

  // Ký cặp token mới + lưu jti của refresh token vào allowlist (Redis)
  private async issueTokens(user: { id: string; email: string; role: string }) {
    const jti = randomUUID();
    const accessPayload = { sub: user.id, email: user.email, role: user.role };
    const refreshPayload = { sub: user.id, jti };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.config.get('jwt.accessSecret'),
        expiresIn: this.config.get('jwt.accessExpiresIn'),
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.config.get('jwt.refreshSecret'),
        expiresIn: this.config.get('jwt.refreshExpiresIn'),
      }),
    ]);

    // TTL của key Redis = thời gian sống còn lại của refresh token (theo claim exp)
    const decoded = this.jwtService.decode(refreshToken) as { exp: number };
    const ttlSeconds = decoded.exp - Math.floor(Date.now() / 1000);
    await this.refreshStore.store(user.id, jti, ttlSeconds);

    return { accessToken, refreshToken };
  }
}

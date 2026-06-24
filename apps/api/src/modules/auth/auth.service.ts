import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
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
    const payload = { sub: user.id, email: user.email, role: user.role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get('jwt.accessSecret'),
        expiresIn: this.config.get('jwt.accessExpiresIn'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get('jwt.refreshSecret'),
        expiresIn: this.config.get('jwt.refreshExpiresIn'),
      }),
    ]);
    return { accessToken, refreshToken };
  }

  // Refresh token đã được JwtRefreshStrategy verify ở guard; chỉ nhận userId.
  async refreshTokens(userId: string) {
    // Đọc lại user từ DB để role luôn cập nhật
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('Người dùng không tồn tại');

    const newPayload = { sub: user.id, email: user.email, role: user.role };
    const [accessToken, newRefreshToken] = await Promise.all([
      this.jwtService.signAsync(newPayload, {
        secret: this.config.get('jwt.accessSecret'),
        expiresIn: this.config.get('jwt.accessExpiresIn'),
      }),
      this.jwtService.signAsync(newPayload, {
        secret: this.config.get('jwt.refreshSecret'),
        expiresIn: this.config.get('jwt.refreshExpiresIn'),
      }),
    ]);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: { name: user.name, email: user.email, role: user.role },
    };
  }
}

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
    if (!user) return null;
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    return isMatch ? user : null;
  }

  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.usersService.create({ name: dto.name, email: dto.email, passwordHash });
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

  async refreshTokens(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        email: string;
      }>(refreshToken, {
        secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
      });

      const [accessToken, newRefreshToken] = await Promise.all([
        this.jwtService.signAsync(
          { sub: payload.sub, email: payload.email },
          {
            secret: this.config.get('jwt.accessSecret'),
            expiresIn: this.config.get('jwt.accessExpiresIn'),
          },
        ),
        this.jwtService.signAsync(
          { sub: payload.sub, email: payload.email },
          {
            secret: this.config.get('jwt.refreshSecret'),
            expiresIn: this.config.get('jwt.refreshExpiresIn'),
          },
        ),
      ]);

      return { accessToken, refreshToken: newRefreshToken };
    } catch (err: any) {
      if (err?.name === 'TokenExpiredError')
        throw new UnauthorizedException('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }
  }
}

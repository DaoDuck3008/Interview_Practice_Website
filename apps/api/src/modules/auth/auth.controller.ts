import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ConfigService } from '@nestjs/config';

const REFRESH_COOKIE = 'refresh_token';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private config: ConfigService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.validateUser(dto.email, dto.password);
    if (!user)
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');

    const { accessToken, refreshToken } = await this.authService.login(user);
    res.cookie(REFRESH_COOKIE, refreshToken, this.cookieOptions());
    return {
      accessToken,
      user: { name: user.name, email: user.email, role: user.role },
    };
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = (req as any).cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!token) throw new UnauthorizedException('Refresh token không tồn tại');

    const { accessToken, refreshToken, user } =
      await this.authService.refreshTokens(token);
    res.cookie(REFRESH_COOKIE, refreshToken, this.cookieOptions());
    return { accessToken, user };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(REFRESH_COOKIE);
    return { message: 'Đăng xuất thành công' };
  }

  private cookieOptions() {
    const isProd = this.config.get('NODE_ENV') === 'production';
    return {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };
  }
}

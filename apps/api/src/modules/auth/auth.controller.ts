import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuditAction } from '@prisma/client';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendCodeDto } from './dto/resend-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ConfigService } from '@nestjs/config';
import { LocalAuthGuard } from '../../common/guards/local-auth.guard';
import { JwtRefreshGuard } from '../../common/guards/jwt-refresh.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  THROTTLE_AUTH_CODE,
  THROTTLE_AUTH_EMAIL,
  THROTTLE_AUTH_LOGIN,
  THROTTLE_AUTH_MODERATE,
  THROTTLE_REFRESH,
} from '../../common/throttling/throttle-profiles';
import { Audit } from '../audit/audit.decorator';

const REFRESH_COOKIE = 'refresh_token';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private config: ConfigService,
  ) {}

  @Post('register')
  @Throttle(THROTTLE_AUTH_EMAIL)
  @Audit({
    action: AuditAction.USER_REGISTER,
    entityType: 'User',
    metadata: ({ request }) => ({ email: request.body?.email }),
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('verify-email')
  @Throttle(THROTTLE_AUTH_CODE)
  @Audit({
    action: AuditAction.USER_VERIFY_EMAIL,
    entityType: 'User',
    metadata: ({ request }) => ({ email: request.body?.email }),
  })
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } =
      await this.authService.verifyEmail(dto.email, dto.code);
    res.cookie(REFRESH_COOKIE, refreshToken, this.cookieOptions());
    return { accessToken, user };
  }

  @Post('resend-verification')
  @Throttle(THROTTLE_AUTH_EMAIL)
  resendVerification(@Body() dto: ResendCodeDto) {
    return this.authService.resendVerification(dto.email);
  }

  @Post('forgot-password')
  @Throttle(THROTTLE_AUTH_EMAIL)
  forgotPassword(@Body() dto: ResendCodeDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @Throttle(THROTTLE_AUTH_CODE)
  @Audit({
    action: AuditAction.USER_RESET_PASSWORD,
    entityType: 'User',
    metadata: ({ request }) => ({ email: request.body?.email }),
  })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.email, dto.code, dto.password);
  }

  // Thông tin cá nhân của user đang đăng nhập.
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: { id: string }) {
    return this.authService.getProfile(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @Audit({
    action: AuditAction.USER_CHANGE_PASSWORD,
    entityType: 'User',
    entityId: ({ request }) => request.user?.id,
    targetUserId: ({ request }) => request.user?.id,
  })
  changePassword(
    @CurrentUser() user: { id: string },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      user.id,
      dto.oldPassword,
      dto.newPassword,
    );
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @Throttle(THROTTLE_AUTH_LOGIN)
  async login(
    @Body() _dto: LoginDto,
    @CurrentUser()
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      avatarUrl: string | null;
    },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.login(user);
    res.cookie(REFRESH_COOKIE, refreshToken, this.cookieOptions());
    return {
      accessToken,
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  @Post('google')
  @Throttle(THROTTLE_AUTH_MODERATE)
  async google(
    @Body() dto: GoogleLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } =
      await this.authService.googleLogin(dto.idToken);
    res.cookie(REFRESH_COOKIE, refreshToken, this.cookieOptions());
    return { accessToken, user };
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @Throttle(THROTTLE_REFRESH)
  async refresh(
    @CurrentUser() current: { id: string; jti: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } =
      await this.authService.refreshTokens(current.id, current.jti);
    res.cookie(REFRESH_COOKIE, refreshToken, this.cookieOptions());
    return { accessToken, user };
  }

  @Post('logout')
  @Throttle(THROTTLE_REFRESH)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = (req as any).cookies?.[REFRESH_COOKIE] as string | undefined;
    await this.authService.logout(token);
    const { maxAge: _maxAge, ...clearOptions } = this.cookieOptions();
    res.clearCookie(REFRESH_COOKIE, clearOptions);
    return { message: 'Đăng xuất thành công' };
  }

  private cookieOptions() {
    // frontend (daoduck.id.vn) và API (backend.daoduck.id.vn) cùng registrable
    // domain → same-site, nên SameSite=Lax vẫn gửi cookie kèm request refresh.
    // Chỉ cần bật Secure khi chạy qua HTTPS (tunnel). Local http giữ secure=false.
    const isHttps = (this.config.get<string>('FRONTEND_URL') ?? '').startsWith(
      'https://',
    );
    return {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax' as const,
      path: '/api/v1/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };
  }
}

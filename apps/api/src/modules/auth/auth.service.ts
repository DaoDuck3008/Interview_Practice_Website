import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenStore } from './refresh-token.store';
import { VerificationCodeStore } from './verification-code.store';
import { MailService } from '../mail/mail.service';

// Các field an toàn để trả về client
const authUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  avatarUrl: true,
} as const;

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
    private refreshStore: RefreshTokenStore,
    private prisma: PrismaService,
    private codeStore: VerificationCodeStore,
    private mail: MailService,
  ) {
    this.googleClient = new OAuth2Client(
      this.config.getOrThrow<string>('google.clientId'),
    );
  }

  // Verify ID token với thư viện chính chủ của Google; audience phải khớp CLIENT_ID
  private async verifyGoogleToken(idToken: string) {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: this.config.getOrThrow<string>('google.clientId'),
      });
      const payload = ticket.getPayload();
      if (!payload) throw new Error('Payload rỗng');
      return payload;
    } catch {
      throw new UnauthorizedException('Token Google không hợp lệ');
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

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    // Luôn chạy bcrypt để tránh timing attack (không để lộ email tồn tại qua response time)
    const hash =
      user?.passwordHash ?? '$2b$10$invalidhashfortimingprotectionxx';
    const isMatch = await bcrypt.compare(password, hash);
    if (!user || !isMatch) return null;

    // Đúng mật khẩu nhưng chưa xác thực email → chặn cứng, báo errorCode riêng
    // để frontend điều hướng sang trang nhập mã.
    if (!user.emailVerified) {
      throw new ForbiddenException({
        message: 'Tài khoản chưa xác thực email. Vui lòng kiểm tra hộp thư.',
        errorCode: 'EMAIL_NOT_VERIFIED',
      });
    }
    return user;
  }

  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
    });
    // Sinh mã 6 số, lưu Redis (TTL 10 phút) và gửi qua email để xác thực.
    const code = await this.codeStore.issue('verify', user.email);
    await this.mail.sendVerificationCode(user.email, user.name, code);
    return { email: user.email };
  }

  /** Xác thực email bằng mã 6 số → đánh dấu đã xác thực và đăng nhập luôn. */
  async verifyEmail(email: string, code: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user)
      throw new BadRequestException('Yêu cầu không hợp lệ hoặc đã hết hạn');
    if (user.emailVerified)
      throw new BadRequestException(
        'Tài khoản đã được xác thực, vui lòng đăng nhập',
      );

    const result = await this.codeStore.verify('verify', email, code);
    this.assertCodeResult(result);

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
      select: authUserSelect,
    });

    const tokens = await this.issueTokens(updated);
    return {
      ...tokens,
      user: {
        name: updated.name,
        email: updated.email,
        role: updated.role,
        avatarUrl: updated.avatarUrl,
      },
    };
  }

  /** Gửi lại mã xác thực (có cooldown). Không tiết lộ trạng thái tài khoản. */
  async resendVerification(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (user && !user.emailVerified) {
      const ttl = await this.codeStore.cooldownTtl('verify', email);
      if (ttl > 0)
        throw new BadRequestException(
          `Vui lòng đợi ${ttl}s trước khi gửi lại mã`,
        );
      const code = await this.codeStore.issue('verify', email);
      await this.mail.sendVerificationCode(email, user.name, code);
    }
    return { message: 'Nếu tài khoản hợp lệ, mã xác thực đã được gửi lại.' };
  }

  /** Quên mật khẩu: gửi mã đặt lại. Luôn trả lời chung để tránh dò email. */
  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    // Chỉ gửi cho tài khoản có mật khẩu (tài khoản Google không đặt lại được).
    if (user?.passwordHash) {
      const ttl = await this.codeStore.cooldownTtl('reset', email);
      if (ttl === 0) {
        const code = await this.codeStore.issue('reset', email);
        await this.mail.sendPasswordResetCode(email, user.name, code);
      }
    }
    return {
      message: 'Nếu email tồn tại, mã đặt lại mật khẩu đã được gửi.',
    };
  }

  /** Đặt lại mật khẩu bằng mã 6 số. */
  async resetPassword(email: string, code: string, newPassword: string) {
    const user = await this.usersService.findByEmail(email);
    const result = await this.codeStore.verify('reset', email, code);
    this.assertCodeResult(result);
    if (!user?.passwordHash)
      throw new BadRequestException('Yêu cầu không hợp lệ hoặc đã hết hạn');

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      // Đặt lại mật khẩu cũng đồng nghĩa đã chứng minh sở hữu email.
      data: { passwordHash, emailVerified: true },
    });
    return { message: 'Đặt lại mật khẩu thành công, vui lòng đăng nhập' };
  }

  // Chuyển kết quả đối chiếu mã của store thành lỗi 400 với thông điệp phù hợp.
  private assertCodeResult(result: 'ok' | 'invalid' | 'expired' | 'locked') {
    if (result === 'ok') return;
    if (result === 'expired')
      throw new BadRequestException('Mã đã hết hạn, vui lòng gửi lại mã mới');
    if (result === 'locked')
      throw new BadRequestException(
        'Bạn đã nhập sai quá nhiều lần, vui lòng gửi lại mã mới',
      );
    throw new BadRequestException('Mã xác thực không đúng');
  }

  async login(user: { id: string; email: string; role: string }) {
    return this.issueTokens(user);
  }

  // Đăng nhập/đăng ký bằng Google: verify ID token, tìm hoặc tạo user, rồi cấp token của hệ thống.
  async googleLogin(idToken: string) {
    const payload = await this.verifyGoogleToken(idToken);
    const email = payload.email;
    const googleId = payload.sub;

    if (!email || !payload.email_verified)
      throw new UnauthorizedException('Email Google chưa được xác minh');

    const picture = payload.picture;
    const existing = await this.usersService.findByEmail(email);

    let user: {
      id: string;
      email: string;
      name: string;
      role: string;
      avatarUrl: string | null;
    };

    if (existing?.googleId) {
      // Đã liên kết Google từ trước thì dùng luôn
      user = existing;
    } else if (existing) {
      // Có tài khoản cùng email nhưng chưa liên kết thì gắn googleId
      user = await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          googleId,
          emailVerified: true, // Google đã xác minh email → coi như đã xác thực
          ...(existing.avatarUrl ? {} : { avatarUrl: picture }), // Chỉ set avatar nếu user chưa có avatar
        },
        select: authUserSelect,
      });
    } else {
      // Chưa có thì tạo tài khoản mới từ thông tin Google (không mật khẩu)
      user = await this.prisma.user.create({
        data: {
          email,
          name: payload.name ?? email,
          googleId,
          avatarUrl: picture,
          emailVerified: true, // Google đã xác minh email
        },
        select: authUserSelect,
      });
    }

    const tokens = await this.issueTokens(user);
    return {
      ...tokens,
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    };
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
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
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
}

import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../redis/redis.module';

export type OtpPurpose = 'verify' | 'reset';

/**
 * Lưu tạm mã OTP 6 số trên Redis cho 2 luồng: xác thực email & quên mật khẩu.
 *   otp:<purpose>:<email>        -> mã (TTL = thời gian sống của mã)
 *   otp:cd:<purpose>:<email>     -> cờ cooldown chống spam gửi lại
 *   otp:try:<purpose>:<email>    -> số lần nhập sai (chống dò mã)
 * Email được chuẩn hoá về chữ thường để khớp key bất kể người dùng gõ hoa/thường.
 */
@Injectable()
export class VerificationCodeStore {
  // Mã sống 10 phút; chặn gửi lại trong 60s; tối đa 5 lần nhập sai.
  static readonly CODE_TTL_SECONDS = 10 * 60;
  static readonly RESEND_COOLDOWN_SECONDS = 60;
  static readonly MAX_ATTEMPTS = 5;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  private codeKey(purpose: OtpPurpose, email: string) {
    return `otp:${purpose}:${email.toLowerCase()}`;
  }
  private cooldownKey(purpose: OtpPurpose, email: string) {
    return `otp:cd:${purpose}:${email.toLowerCase()}`;
  }
  private attemptsKey(purpose: OtpPurpose, email: string) {
    return `otp:try:${purpose}:${email.toLowerCase()}`;
  }

  /** Sinh + lưu mã mới, đặt cooldown, reset bộ đếm nhập sai. */
  async issue(purpose: OtpPurpose, email: string): Promise<string> {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    await this.redis.set(
      this.codeKey(purpose, email),
      code,
      'EX',
      VerificationCodeStore.CODE_TTL_SECONDS,
    );
    await this.redis.set(
      this.cooldownKey(purpose, email),
      '1',
      'EX',
      VerificationCodeStore.RESEND_COOLDOWN_SECONDS,
    );
    await this.redis.del(this.attemptsKey(purpose, email));
    return code;
  }

  /** Số giây còn lại của cooldown gửi lại (0 nếu được phép gửi). */
  async cooldownTtl(purpose: OtpPurpose, email: string): Promise<number> {
    const ttl = await this.redis.ttl(this.cooldownKey(purpose, email));
    return ttl > 0 ? ttl : 0;
  }

  /**
   * Đối chiếu mã. Đúng -> xoá mã + bộ đếm, trả 'ok'.
   * Sai -> tăng bộ đếm; vượt ngưỡng thì xoá mã, trả 'locked'.
   */
  async verify(
    purpose: OtpPurpose,
    email: string,
    code: string,
  ): Promise<'ok' | 'invalid' | 'expired' | 'locked'> {
    const stored = await this.redis.get(this.codeKey(purpose, email));
    if (!stored) return 'expired';

    if (stored === code) {
      await this.redis.del(
        this.codeKey(purpose, email),
        this.attemptsKey(purpose, email),
      );
      return 'ok';
    }

    const attempts = await this.redis.incr(this.attemptsKey(purpose, email));
    if (attempts === 1) {
      await this.redis.expire(
        this.attemptsKey(purpose, email),
        VerificationCodeStore.CODE_TTL_SECONDS,
      );
    }
    if (attempts >= VerificationCodeStore.MAX_ATTEMPTS) {
      await this.redis.del(
        this.codeKey(purpose, email),
        this.attemptsKey(purpose, email),
      );
      return 'locked';
    }
    return 'invalid';
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../redis/redis.module';

export type OtpPurpose = 'verify' | 'reset';
type OtpVerificationResult = 'ok' | 'invalid' | 'expired' | 'locked';

const VERIFY_OTP_SCRIPT = `
local codeKey = KEYS[1]
local attemptsKey = KEYS[2]
local inputCode = ARGV[1]
local maxAttempts = tonumber(ARGV[2])

local storedCode = redis.call('GET', codeKey)
if not storedCode then
  return 'expired'
end

if storedCode == inputCode then
  redis.call('DEL', codeKey, attemptsKey)
  return 'ok'
end

local attempts = redis.call('INCR', attemptsKey)
if attempts == 1 then
  local codeTtl = redis.call('PTTL', codeKey)
  if codeTtl > 0 then
    redis.call('PEXPIRE', attemptsKey, codeTtl)
  end
end

if attempts >= maxAttempts then
  redis.call('DEL', codeKey, attemptsKey)
  return 'locked'
end

return 'invalid'
`;

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
   * Đối chiếu, xoá OTP đúng hoặc tăng bộ đếm sai trong một Lua script Redis nguyên tử.
   * Không tách GET/DEL thành nhiều lệnh vì hai request song song có thể cùng dùng một OTP.
   */
  async verify(
    purpose: OtpPurpose,
    email: string,
    code: string,
  ): Promise<OtpVerificationResult> {
    return (await this.redis.eval(
      VERIFY_OTP_SCRIPT,
      2,
      this.codeKey(purpose, email),
      this.attemptsKey(purpose, email),
      code,
      VerificationCodeStore.MAX_ATTEMPTS,
    )) as OtpVerificationResult;
  }
}

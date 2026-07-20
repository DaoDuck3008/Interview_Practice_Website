import { createHash } from 'crypto';
import { ExecutionContext } from '@nestjs/common';

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;

type IdentityResolver = (context: ExecutionContext) => string | undefined;

function shortHash(value: string) {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

function emailFromBody(context: ExecutionContext) {
  const req = context
    .switchToHttp()
    .getRequest<{ body?: { email?: unknown } }>();
  const email = req.body?.email;
  return typeof email === 'string' ? email.trim().toLowerCase() : undefined;
}

function makeProfileKey(profile: string, resolveIdentity?: IdentityResolver) {
  return (context: ExecutionContext, tracker: string) => {
    const controller = context.getClass().name;
    const handler = context.getHandler().name;
    const trackerHash = shortHash(tracker);
    const identity = resolveIdentity?.(context);
    const identityPart = identity ? `:${shortHash(identity)}` : '';
    return `${profile}:${controller}.${handler}:${trackerHash}${identityPart}`;
  };
}

function throttleProfile(
  profile: string,
  limit: number,
  ttl: number,
  blockDuration: number,
  resolveIdentity?: IdentityResolver,
) {
  return {
    default: {
      limit,
      ttl,
      blockDuration,
      generateKey: makeProfileKey(profile, resolveIdentity),
    },
  };
}

// Login chạy bcrypt và là mục tiêu brute force trực tiếp, nên giữ chặt hơn các
// luồng auth public khác.
export const THROTTLE_AUTH_LOGIN = throttleProfile(
  'auth-login',
  30,
  5 * MINUTE_MS,
  5 * MINUTE_MS,
  emailFromBody,
);

// Register/resend/forgot-password có gửi email nhưng service đã có các lớp
// chống spam theo email/cooldown. Limit này chủ yếu chặn burst theo IP.
export const THROTTLE_AUTH_EMAIL = throttleProfile(
  'auth-email',
  10,
  10 * MINUTE_MS,
  5 * MINUTE_MS,
  emailFromBody,
);

// Verify/reset-password có store OTP giới hạn số lần thử theo email. Nới hơn
// login để tránh chặn oan khi user nhập nhầm mã hoặc retry do lỗi mạng.
export const THROTTLE_AUTH_CODE = throttleProfile(
  'auth-code',
  15,
  10 * MINUTE_MS,
  5 * MINUTE_MS,
  emailFromBody,
);

// Google login vẫn phải verify token bên ngoài, nhưng user thật có thể retry
// vài lần khi popup/callback OAuth bị gián đoạn.
export const THROTTLE_AUTH_MODERATE = throttleProfile(
  'auth-google',
  20,
  5 * MINUTE_MS,
  60 * SECOND_MS,
);

// Refresh/logout có thể chạy nền ở nhiều tab, nên nới hơn login nhưng vẫn
// chặn được vòng lặp xoay token bất thường.
export const THROTTLE_REFRESH = throttleProfile(
  'auth-refresh',
  30,
  3 * MINUTE_MS,
  60 * SECOND_MS,
);

// Upload/audio tốn bandwidth/storage và có thể kéo theo Groq/R2. QuotaGuard và
// ConcurrencyInterceptor đã chặn theo user, nên ở đây chỉ cần chống burst IP.
export const THROTTLE_HEAVY_UPLOAD = throttleProfile(
  'heavy-upload',
  30,
  10 * MINUTE_MS,
  2 * MINUTE_MS,
);

// Score/improve/ mockInterview đưa job AI vào queue. QuotaGuard kiểm soát hạn mức nghiệp vụ,
// AiJobsService dedup job theo session và service trả cache khi đã có kết quả.
// Limit này vì vậy chỉ cần chặn spam click/script quá mức.
export const THROTTLE_AI_ACTION = throttleProfile(
  'ai-action',
  60,
  10 * MINUTE_MS,
  2 * MINUTE_MS,
);

// Checkout là endpoint "tạo hoặc tái dùng" đơn PENDING. Người dùng có thể
// refresh QR nhiều lần khi mạng/Sepay lỗi, nên nới hơn các mutation tạo mới
// thuần túy; service vẫn tái dùng đơn cũ để tránh tạo trùng.
export const THROTTLE_CHECKOUT = throttleProfile(
  'checkout',
  30,
  10 * MINUTE_MS,
  60 * SECOND_MS,
);

// Admin mutation đã có auth, nhưng vẫn cần lớp chắn vừa phải cho click nhầm liên tục hoặc phiên admin bị lạm dụng.
export const THROTTLE_ADMIN_MUTATION = throttleProfile(
  'admin-mutation',
  60,
  5 * MINUTE_MS,
  60 * SECOND_MS,
);

// Các thao tác admin nhạy cảm hơn CRUD thường: cấp gói, reset mật khẩu hộ user,
// chấm điểm tay. Siết riêng để giảm rủi ro khi phiên admin bị lạm dụng.
export const THROTTLE_ADMIN_SENSITIVE = throttleProfile(
  'admin-sensitive',
  10,
  10 * MINUTE_MS,
  5 * MINUTE_MS,
);

// Tin nhắn WebSocket không đi qua HTTP throttler guard, nên gateway dùng
// profile này thủ công cho support chat.
export const WS_SUPPORT_LIMIT = {
  ttl: 60 * SECOND_MS,
  limit: 30,
  blockDuration: 60 * SECOND_MS,
  throttlerName: 'ws-support',
};

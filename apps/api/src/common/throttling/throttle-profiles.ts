import { createHash } from 'crypto';
import { ExecutionContext } from '@nestjs/common';

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const DAY_MS = 24 * 60 * MINUTE_MS;

type IdentityResolver = (context: ExecutionContext) => string | undefined;

interface ThrottleWindow {
  limit: number;
  ttl: number;
  blockDuration: number;
}

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
  burst: ThrottleWindow,
  sustained: ThrottleWindow,
  resolveIdentity?: IdentityResolver,
) {
  return {
    // Hai key có thêm tên cửa sổ để counter burst và sustained không cộng lẫn nhau.
    burst: {
      ...burst,
      generateKey: makeProfileKey(`${profile}:burst`, resolveIdentity),
    },
    sustained: {
      ...sustained,
      generateKey: makeProfileKey(`${profile}:sustained`, resolveIdentity),
    },
  };
}

// Login chạy bcrypt và là mục tiêu brute force trực tiếp, nên giữ chặt hơn các
// luồng auth public khác.
export const THROTTLE_AUTH_LOGIN = throttleProfile(
  'auth-login',
  { limit: 5, ttl: MINUTE_MS, blockDuration: 5 * MINUTE_MS },
  { limit: 15, ttl: 10 * MINUTE_MS, blockDuration: 5 * MINUTE_MS },
  emailFromBody,
);

// Register/resend/forgot-password có gửi email nhưng service đã có các lớp
// chống spam theo email/cooldown. Hai cửa sổ này chặn cả burst IP lẫn spam kéo dài.
export const THROTTLE_AUTH_EMAIL = throttleProfile(
  'auth-email',
  { limit: 2, ttl: MINUTE_MS, blockDuration: MINUTE_MS },
  { limit: 5, ttl: 15 * MINUTE_MS, blockDuration: 5 * MINUTE_MS },
  emailFromBody,
);

// Verify/reset-password có store OTP giới hạn số lần thử theo email. Nới hơn
// login để tránh chặn oan khi user nhập nhầm mã hoặc retry do lỗi mạng.
export const THROTTLE_AUTH_CODE = throttleProfile(
  'auth-code',
  { limit: 3, ttl: 30 * SECOND_MS, blockDuration: 30 * SECOND_MS },
  { limit: 10, ttl: 15 * MINUTE_MS, blockDuration: 5 * MINUTE_MS },
  emailFromBody,
);

// Google login vẫn phải verify token bên ngoài, nhưng user thật có thể retry
// vài lần khi popup/callback OAuth bị gián đoạn.
export const THROTTLE_AUTH_MODERATE = throttleProfile(
  'auth-google',
  { limit: 5, ttl: MINUTE_MS, blockDuration: MINUTE_MS },
  { limit: 15, ttl: 10 * MINUTE_MS, blockDuration: 2 * MINUTE_MS },
);

// Refresh/logout có thể chạy nền ở nhiều tab, nên nới hơn login nhưng vẫn
// chặn được vòng lặp xoay token bất thường.
export const THROTTLE_REFRESH = throttleProfile(
  'auth-refresh',
  { limit: 10, ttl: MINUTE_MS, blockDuration: MINUTE_MS },
  { limit: 30, ttl: 10 * MINUTE_MS, blockDuration: 2 * MINUTE_MS },
);

// Upload/audio tốn bandwidth/storage và có thể kéo theo Groq/R2. Credit reservation và
// ConcurrencyInterceptor bảo vệ nghiệp vụ theo user; hai cửa sổ này bảo vệ hạ tầng theo IP.
export const THROTTLE_HEAVY_UPLOAD = throttleProfile(
  'heavy-upload',
  { limit: 3, ttl: 30 * SECOND_MS, blockDuration: 30 * SECOND_MS },
  { limit: 15, ttl: 10 * MINUTE_MS, blockDuration: 2 * MINUTE_MS },
);

// Score/improve/mockInterview đưa job AI vào queue. Credit reservation kiểm soát hạn mức,
// AiJobsService dedup job theo session và service trả cache khi đã có kết quả.
// Hai cửa sổ còn lại chặn spam click/script theo IP.
export const THROTTLE_AI_ACTION = throttleProfile(
  'ai-action',
  { limit: 3, ttl: 30 * SECOND_MS, blockDuration: 30 * SECOND_MS },
  { limit: 10, ttl: 10 * MINUTE_MS, blockDuration: 2 * MINUTE_MS },
);

// Các profile này dùng chung RedisThrottlerStorage với throttler toàn hệ thống.
// Khi được gắn UserActionThrottlerGuard, tracker là user id thay vì IP. Môi
// trường development nhân 10 limit để việc thử nghiệm không bị cản trở.
export const THROTTLE_USER_AUDIO_UPLOAD = throttleProfile(
  'user-audio-upload',
  { limit: 5, ttl: MINUTE_MS, blockDuration: MINUTE_MS },
  { limit: 60, ttl: DAY_MS, blockDuration: DAY_MS },
);

export const THROTTLE_USER_CV_UPLOAD = throttleProfile(
  'user-cv-upload',
  { limit: 1, ttl: MINUTE_MS, blockDuration: MINUTE_MS },
  { limit: 4, ttl: DAY_MS, blockDuration: DAY_MS },
);

export const THROTTLE_USER_CV_RETRY = throttleProfile(
  'user-cv-retry',
  { limit: 1, ttl: MINUTE_MS, blockDuration: MINUTE_MS },
  { limit: 3, ttl: DAY_MS, blockDuration: DAY_MS },
);

export const THROTTLE_USER_MOCK_SUBMIT = throttleProfile(
  'user-mock-submit',
  { limit: 3, ttl: MINUTE_MS, blockDuration: MINUTE_MS },
  { limit: 12, ttl: DAY_MS, blockDuration: DAY_MS },
);

export const THROTTLE_USER_MOCK_SCORE_RETRY = throttleProfile(
  'user-mock-score-retry',
  { limit: 2, ttl: MINUTE_MS, blockDuration: MINUTE_MS },
  { limit: 10, ttl: DAY_MS, blockDuration: DAY_MS },
);

export const THROTTLE_USER_EXPLANATION = throttleProfile(
  'user-explanation',
  { limit: 3, ttl: MINUTE_MS, blockDuration: MINUTE_MS },
  { limit: 15, ttl: DAY_MS, blockDuration: DAY_MS },
);

// Checkout là endpoint "tạo hoặc tái dùng" đơn PENDING. Người dùng có thể
// refresh QR nhiều lần khi mạng/Sepay lỗi, nên nới hơn các mutation tạo mới
// thuần túy; service vẫn tái dùng đơn cũ để tránh tạo trùng.
export const THROTTLE_CHECKOUT = throttleProfile(
  'checkout',
  { limit: 3, ttl: MINUTE_MS, blockDuration: MINUTE_MS },
  { limit: 10, ttl: 10 * MINUTE_MS, blockDuration: 2 * MINUTE_MS },
);

// Webhook Sepay có thể retry tự động, nên nới hơn endpoint người dùng
export const THROTTLE_PAYMENT_WEBHOOK = throttleProfile(
  'payment-webhook',
  { limit: 30, ttl: MINUTE_MS, blockDuration: MINUTE_MS },
  { limit: 300, ttl: 10 * MINUTE_MS, blockDuration: 5 * MINUTE_MS },
);

// Admin mutation đã có auth, nhưng vẫn cần lớp chắn vừa phải cho click nhầm liên tục hoặc phiên admin bị lạm dụng.
export const THROTTLE_ADMIN_MUTATION = throttleProfile(
  'admin-mutation',
  { limit: 10, ttl: MINUTE_MS, blockDuration: MINUTE_MS },
  { limit: 40, ttl: 10 * MINUTE_MS, blockDuration: 2 * MINUTE_MS },
);

// Các thao tác admin nhạy cảm hơn CRUD thường: cấp gói, reset mật khẩu hộ user,
// chấm điểm tay. Siết riêng để giảm rủi ro khi phiên admin bị lạm dụng.
export const THROTTLE_ADMIN_SENSITIVE = throttleProfile(
  'admin-sensitive',
  { limit: 3, ttl: 5 * MINUTE_MS, blockDuration: 5 * MINUTE_MS },
  { limit: 10, ttl: 60 * MINUTE_MS, blockDuration: 10 * MINUTE_MS },
);

// Tin nhắn WebSocket không đi qua HTTP throttler guard, nên gateway dùng
// profile này thủ công cho support chat.
export const WS_SUPPORT_LIMIT = {
  ttl: 60 * SECOND_MS,
  limit: 30,
  blockDuration: 60 * SECOND_MS,
  throttlerName: 'ws-support',
};

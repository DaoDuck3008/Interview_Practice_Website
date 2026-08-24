import { applyDecorators, SetMetadata } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

export const USER_ACTION_THROTTLE = 'user-action-throttle';

/** Đánh dấu profile throttle cần chạy thêm sau JwtAuthGuard theo user id. */
export function UserActionThrottle(options: Parameters<typeof Throttle>[0]) {
  return applyDecorators(
    Throttle(options),
    SetMetadata(USER_ACTION_THROTTLE, true),
  );
}

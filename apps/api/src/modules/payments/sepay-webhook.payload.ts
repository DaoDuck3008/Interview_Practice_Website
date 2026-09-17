import { BadRequestException } from '@nestjs/common';

/**
 * Các field SePay cam kết trong webhook JSON. Provider có thể thêm field mới,
 * vì vậy parser chỉ chuẩn hóa field cần dùng thay vì từ chối toàn bộ field lạ.
 */
export interface SepayWebhookPayload {
  id: number;
  code?: string;
  content?: string;
  description?: string;
  referenceCode?: string;
  transferAmount: number;
  transferType: 'in' | 'out';
}

/** Chuẩn hóa payload đã qua HMAC trước khi dùng cho nghiệp vụ thanh toán. */
export function parseSepayWebhookPayload(
  value: unknown,
): SepayWebhookPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Payload webhook không hợp lệ');
  }

  const payload = value as Record<string, unknown>;
  const id = toPositiveSafeInteger(payload.id);
  const transferAmount = toNonNegativeFiniteNumber(payload.transferAmount);
  const transferType = payload.transferType;

  if (
    id === null ||
    transferAmount === null ||
    (transferType !== 'in' && transferType !== 'out')
  ) {
    throw new BadRequestException('Payload webhook không hợp lệ');
  }

  return {
    id,
    transferAmount,
    transferType,
    code: optionalString(payload.code, 128),
    content: optionalString(payload.content, 2_000),
    description: optionalString(payload.description, 2_000),
    referenceCode: optionalString(payload.referenceCode, 256),
  };
}

function toPositiveSafeInteger(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    return null;
  }
  return value;
}

function toNonNegativeFiniteNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return value;
}

function optionalString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  return value.slice(0, maxLength);
}

import { HttpException } from '@nestjs/common';

/** Chỉ lưu mã lỗi an toàn, không đưa raw AI response hoặc dữ liệu CV vào DB. */
export function mockCvErrorCode(error: unknown): string {
  if (error instanceof HttpException) {
    return `HTTP_${error.getStatus()}`;
  }
  return error instanceof Error ? error.name.slice(0, 100) : 'UNKNOWN_ERROR';
}

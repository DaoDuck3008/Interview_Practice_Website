import { toast } from "react-toastify";

/**
 * Xử lý lỗi API dùng chung cho toàn frontend.
 * Khớp envelope lỗi của backend (HttpExceptionFilter):
 *   { success:false, statusCode, errorCode, message, errors }
 * - Lỗi thường: `message` là chuỗi tiếng Việt.
 * - Lỗi validation: `message = "Validation failed"`, chi tiết nằm ở mảng `errors`.
 */

interface ApiErrorBody {
  statusCode?: number;
  errorCode?: string;
  message?: string;
  errors?: string[] | null;
}

interface AxiosLikeError {
  response?: { status?: number; data?: ApiErrorBody };
  request?: unknown;
  message?: string;
  code?: string;
}

const DEFAULT_MESSAGE = "Đã có lỗi xảy ra. Vui lòng thử lại.";
const NETWORK_MESSAGE =
  "Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.";

/** Trích message thân thiện (tiếng Việt) từ một lỗi API/axios bất kỳ. */
export function getApiErrorMessage(
  error: unknown,
  fallback: string = DEFAULT_MESSAGE,
): string {
  const err = error as AxiosLikeError;
  const data = err?.response?.data;

  if (data) {
    // Lỗi validation -> ưu tiên chi tiết trong `errors`.
    if (Array.isArray(data.errors) && data.errors.length > 0) {
      return data.errors[0];
    }
    if (typeof data.message === "string" && data.message.trim()) {
      return data.message;
    }
  }

  // Gửi được request nhưng không nhận response -> mạng lỗi / server không phản hồi.
  if (err?.request && !err?.response) {
    return NETWORK_MESSAGE;
  }

  return fallback;
}

/** Lấy HTTP status (nếu có) để phân nhánh xử lý (401/403/404…). */
export function getApiErrorStatus(error: unknown): number | undefined {
  return (error as AxiosLikeError)?.response?.status;
}

/**
 * Tiện ích phổ biến nhất: trích message rồi hiện `toast.error`.
 * Trả về message để dùng tiếp nếu cần.
 */
export function toastApiError(
  error: unknown,
  fallback: string = DEFAULT_MESSAGE,
): string {
  const message = getApiErrorMessage(error, fallback);
  toast.error(message);
  return message;
}

const SENSITIVE_QUERY_PARAMS = /([?&](?:access_token|api[_-]?key|authorization|password|refresh_token|secret|token)=)[^&#\s]*/gi;
const URL_CREDENTIALS = /([a-z][a-z0-9+.-]*:\/\/)[^\s/@]+@/gi;
const BEARER_TOKEN = /(bearer\s+)[a-z0-9._~+/-]+=*/gi;
const NAMED_SECRET = /\b(password|secret|token|api[_-]?key)\b(\s*[:=]\s*)([^\s,;}&]+)/gi;

/** Xóa credential phổ biến trước khi ghi lỗi từ provider hay hạ tầng vào log. */
export function redactSensitiveLogData(value: string): string {
  return value
    .replace(URL_CREDENTIALS, '$1[REDACTED]@')
    .replace(SENSITIVE_QUERY_PARAMS, '$1[REDACTED]')
    .replace(BEARER_TOKEN, '$1[REDACTED]')
    .replace(NAMED_SECRET, '$1$2[REDACTED]');
}

/** Access log không cần query string, nơi thường chứa token, email hoặc dữ liệu tìm kiếm. */
export function requestPathWithoutQuery(request: {
  baseUrl?: string;
  path?: string;
}): string {
  return `${request.baseUrl ?? ''}${request.path ?? ''}` || '/';
}

/** Chỉ mô tả Redis endpoint, tuyệt đối không đưa username/password/query vào log. */
export function describeRedisEndpoint(url: string): string {
  try {
    const parsed = new URL(url);
    const port = parsed.port ? `:${parsed.port}` : '';
    return `${parsed.protocol}//${parsed.hostname}${port}`;
  } catch {
    return 'redis://[invalid-url]';
  }
}

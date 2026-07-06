import { escapeHtml } from '../../../common/utils/format.util';

/**
 * Template email chứa mã OTP 6 số (dùng cho xác thực email & đặt lại mật khẩu).
 * Dùng inline-style để hiển thị ổn định trên mọi mail client.
 */
export interface CodeEmailOptions {
  name: string;
  code: string;
  heading: string;
  intro: string;
}

export function codeEmailTemplate(opts: CodeEmailOptions): string {
  const { name, code, heading, intro } = opts;
  return `
  <div style="background:#06060c;padding:40px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#0d0d14;border:1px solid #1c1c28;border-radius:16px;overflow:hidden;">
      <div style="padding:32px 32px 8px;">
        <p style="margin:0;font-size:20px;font-weight:800;color:#f4f4f6;">
          Phỏng vấn <span style="color:#8b5cf6;">IT</span>
        </p>
      </div>
      <div style="padding:8px 32px 32px;">
        <h1 style="margin:16px 0 8px;font-size:22px;font-weight:700;color:#f4f4f6;">${heading}</h1>
        <p style="margin:0 0 8px;font-size:14px;color:#9898aa;">Chào ${escapeHtml(name)},</p>
        <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#9898aa;">${intro}</p>
        <div style="background:#13131c;border:1px solid #1c1c28;border-radius:12px;padding:20px;text-align:center;">
          <div style="font-size:34px;font-weight:800;letter-spacing:10px;color:#f4f4f6;">${code}</div>
        </div>
        <p style="margin:24px 0 0;font-size:13px;color:#606072;">Mã có hiệu lực trong 10 phút. Tuyệt đối không chia sẻ mã này cho bất kỳ ai.</p>
      </div>
      <div style="padding:16px 32px;border-top:1px solid #1c1c28;">
        <p style="margin:0;font-size:12px;color:#606072;">© 2026 Phỏng vấn IT. Email tự động, vui lòng không trả lời.</p>
      </div>
    </div>
  </div>`;
}

import { escapeHtml } from '../../../common/utils/format.util';

/**
 * Template email gửi mật khẩu tạm khi admin reset mật khẩu hộ người dùng.
 * Nhấn mạnh người dùng nên đổi lại mật khẩu sau khi đăng nhập.
 */
export interface TempPasswordEmailOptions {
  name: string;
  password: string;
}

export function tempPasswordEmailTemplate(
  opts: TempPasswordEmailOptions,
): string {
  const { name, password } = opts;
  return `
  <div style="background:#06060c;padding:40px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#0d0d14;border:1px solid #1c1c28;border-radius:16px;overflow:hidden;">
      <div style="padding:32px 32px 8px;">
        <p style="margin:0;font-size:20px;font-weight:800;color:#f4f4f6;">
          Interview<span style="color:#8b5cf6;">Prep</span>
        </p>
      </div>
      <div style="padding:8px 32px 32px;">
        <h1 style="margin:16px 0 8px;font-size:22px;font-weight:700;color:#f4f4f6;">Mật khẩu của bạn đã được đặt lại</h1>
        <p style="margin:0 0 8px;font-size:14px;color:#9898aa;">Chào ${escapeHtml(name)},</p>
        <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#9898aa;">Quản trị viên đã đặt lại mật khẩu cho tài khoản của bạn. Dùng mật khẩu tạm bên dưới để đăng nhập.</p>
        <div style="background:#13131c;border:1px solid #1c1c28;border-radius:12px;padding:20px;text-align:center;">
          <div style="font-size:24px;font-weight:800;letter-spacing:2px;color:#f4f4f6;word-break:break-all;">${escapeHtml(password)}</div>
        </div>
        <p style="margin:24px 0 0;font-size:13px;color:#f59e0b;">⚠️ Vì lý do bảo mật, bạn nên đổi lại mật khẩu ngay sau khi đăng nhập.</p>
      </div>
      <div style="padding:16px 32px;border-top:1px solid #1c1c28;">
        <p style="margin:0;font-size:12px;color:#606072;">© 2026 InterviewPrep. Email tự động, vui lòng không trả lời.</p>
      </div>
    </div>
  </div>`;
}

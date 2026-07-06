import { escapeHtml, formatDateVn } from '../../../common/utils/format.util';

/**
 * Template email nhắc gia hạn khi gói đăng ký sắp hết hạn (còn ~2 ngày).
 * Có nút CTA dẫn về trang pricing để gia hạn. URL truyền vào từ config (không hardcode).
 * Dùng inline-style để hiển thị ổn định trên mọi mail client.
 */
export interface RenewalReminderEmailOptions {
  name: string;
  planName: string;
  expiresAt: Date;
  daysLeft: number;
  renewUrl: string;
}

export function renewalReminderEmailTemplate(
  opts: RenewalReminderEmailOptions,
): string {
  const { name, planName, expiresAt, daysLeft, renewUrl } = opts;
  const dayLabel =
    daysLeft <= 0
      ? 'hôm nay'
      : daysLeft === 1
        ? 'trong 1 ngày'
        : `trong ${daysLeft} ngày`;
  return `
  <div style="background:#06060c;padding:40px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#0d0d14;border:1px solid #1c1c28;border-radius:16px;overflow:hidden;">
      <div style="padding:32px 32px 8px;">
        <p style="margin:0;font-size:20px;font-weight:800;color:#f4f4f6;">
          Phỏng vấn <span style="color:#8b5cf6;">IT</span>
        </p>
      </div>
      <div style="padding:8px 32px 32px;">
        <div style="display:inline-block;background:#2a220f;border:1px solid #4a3a1f;border-radius:999px;padding:4px 12px;margin-bottom:12px;">
          <span style="font-size:12px;font-weight:700;color:#f59e0b;">⏳ Gói sắp hết hạn</span>
        </div>
        <h1 style="margin:8px 0 8px;font-size:22px;font-weight:700;color:#f4f4f6;">Gói ${escapeHtml(planName)} của bạn sắp hết hạn</h1>
        <p style="margin:0 0 8px;font-size:14px;color:#9898aa;">Chào ${escapeHtml(name)},</p>
        <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#9898aa;">Gói đăng ký của bạn sẽ hết hạn <strong style="color:#f4f4f6;">${dayLabel}</strong> (${formatDateVn(expiresAt)}). Gia hạn ngay để không bị gián đoạn việc luyện tập.</p>

        <div style="text-align:center;margin:8px 0 4px;">
          <a href="${escapeHtml(renewUrl)}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;">Gia hạn ngay</a>
        </div>
        <p style="margin:16px 0 0;font-size:12px;color:#606072;word-break:break-all;">Hoặc mở liên kết: ${escapeHtml(renewUrl)}</p>
      </div>
      <div style="padding:16px 32px;border-top:1px solid #1c1c28;">
        <p style="margin:0;font-size:12px;color:#606072;">© 2026 Phỏng vấn IT. Email tự động, vui lòng không trả lời.</p>
      </div>
    </div>
  </div>`;
}

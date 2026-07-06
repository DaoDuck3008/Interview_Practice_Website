import {
  escapeHtml,
  formatDateVn,
  formatVnd,
} from '../../../common/utils/format.util';

/**
 * Template email biên nhận thanh toán + xác nhận mua gói thành công.
 * Gửi sau khi đơn được đánh dấu PAID và subscription được kích hoạt/gia hạn.
 * Dùng inline-style để hiển thị ổn định trên mọi mail client.
 */
export interface PurchaseReceiptEmailOptions {
  name: string;
  planName: string;
  amountVnd: number;
  transferCode: string;
  paidAt: Date;
  periodEnd: Date;
}

export function purchaseReceiptEmailTemplate(
  opts: PurchaseReceiptEmailOptions,
): string {
  const { name, planName, amountVnd, transferCode, paidAt, periodEnd } = opts;
  return `
  <div style="background:#06060c;padding:40px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#0d0d14;border:1px solid #1c1c28;border-radius:16px;overflow:hidden;">
      <div style="padding:32px 32px 8px;">
        <p style="margin:0;font-size:20px;font-weight:800;color:#f4f4f6;">
          Phỏng vấn <span style="color:#8b5cf6;">IT</span>
        </p>
      </div>
      <div style="padding:8px 32px 32px;">
        <div style="display:inline-block;background:#132a1c;border:1px solid #1f4a2f;border-radius:999px;padding:4px 12px;margin-bottom:12px;">
          <span style="font-size:12px;font-weight:700;color:#22c55e;">✓ Thanh toán thành công</span>
        </div>
        <h1 style="margin:8px 0 8px;font-size:22px;font-weight:700;color:#f4f4f6;">Cảm ơn bạn đã mua gói ${escapeHtml(planName)}</h1>
        <p style="margin:0 0 8px;font-size:14px;color:#9898aa;">Chào ${escapeHtml(name)},</p>
        <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#9898aa;">Chúng tôi đã nhận được thanh toán của bạn. Gói của bạn đã được kích hoạt và sẵn sàng sử dụng.</p>

        <div style="background:#13131c;border:1px solid #1c1c28;border-radius:12px;padding:8px 20px;">
          ${row('Gói', escapeHtml(planName))}
          ${row('Số tiền', formatVnd(amountVnd))}
          ${row('Mã giao dịch', escapeHtml(transferCode))}
          ${row('Phương thức', 'Chuyển khoản ngân hàng')}
          ${row('Ngày thanh toán', formatDateVn(paidAt))}
          ${row('Hiệu lực đến', formatDateVn(periodEnd), true)}
        </div>

        <p style="margin:24px 0 0;font-size:13px;color:#606072;">Email này là biên nhận cho giao dịch của bạn. Vui lòng giữ lại để đối chiếu khi cần.</p>
      </div>
      <div style="padding:16px 32px;border-top:1px solid #1c1c28;">
        <p style="margin:0;font-size:12px;color:#606072;">© 2026 Phỏng vấn IT. Email tự động, vui lòng không trả lời.</p>
      </div>
    </div>
  </div>`;
}

/** Một dòng chi tiết trong bảng biên nhận. `last` bỏ đường kẻ dưới. */
function row(label: string, value: string, last = false): string {
  const border = last ? '' : 'border-bottom:1px solid #1c1c28;';
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;${border}">
      <span style="font-size:13px;color:#9898aa;">${label}</span>
      <span style="font-size:14px;font-weight:600;color:#f4f4f6;text-align:right;">${value}</span>
    </div>`;
}

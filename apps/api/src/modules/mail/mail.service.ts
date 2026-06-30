import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { codeEmailTemplate } from './templates/code-email.template';
import { tempPasswordEmailTemplate } from './templates/temp-password.template';

/**
 * Gửi email giao dịch qua Resend. Hiện dùng cho:
 *  - Mã xác thực email khi đăng ký
 *  - Mã đặt lại mật khẩu (quên mật khẩu)
 * Nếu thiếu RESEND_API_KEY (ví dụ môi trường dev), service chỉ log mã ra console
 * thay vì gửi thật để vẫn test được luồng.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('resend.apiKey') ?? '';
    this.from = this.config.get<string>('resend.mailFrom') ?? '';
    this.resend = apiKey ? new Resend(apiKey) : null;
    if (!this.resend) {
      this.logger.warn(
        'RESEND_API_KEY chưa cấu hình — email sẽ chỉ được log ra console.',
      );
    }
  }

  async sendVerificationCode(to: string, name: string, code: string) {
    await this.send({
      to,
      subject: `${code} là mã xác thực InterviewPrep của bạn`,
      html: codeEmailTemplate({
        name,
        code,
        heading: 'Xác thực email của bạn',
        intro:
          'Cảm ơn bạn đã đăng ký InterviewPrep. Nhập mã bên dưới để hoàn tất xác thực tài khoản.',
      }),
    });
  }

  async sendPasswordResetCode(to: string, name: string, code: string) {
    await this.send({
      to,
      subject: `${code} là mã đặt lại mật khẩu InterviewPrep`,
      html: codeEmailTemplate({
        name,
        code,
        heading: 'Đặt lại mật khẩu',
        intro:
          'Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Nhập mã bên dưới để tiếp tục. Nếu không phải bạn, hãy bỏ qua email này.',
      }),
    });
  }

  async sendTempPassword(to: string, name: string, password: string) {
    await this.send({
      to,
      subject: 'Mật khẩu InterviewPrep của bạn đã được đặt lại',
      html: tempPasswordEmailTemplate({ name, password }),
    });
  }

  private async send(params: { to: string; subject: string; html: string }) {
    if (!this.resend) {
      this.logger.debug(`[DEV EMAIL] tới ${params.to}: ${params.subject}`);
      return;
    }
    const { error } = await this.resend.emails.send({
      from: this.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    if (error) {
      this.logger.error(`Gửi email thất bại tới ${params.to}: ${error.message}`);
      throw new Error('Không gửi được email, vui lòng thử lại sau');
    }
  }
}

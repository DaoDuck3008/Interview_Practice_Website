import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fork } from 'child_process';
import { join } from 'path';

/**
 * Process chính chỉ điều phối: tạo child có timeout/giới hạn heap và nhận text kết quả.
 * Không parse PDF trực tiếp ở đây để file hỏng hoặc quá nặng không làm chết worker chính.
 */
export class PdfExtractionSandboxError extends Error {}

@Injectable()
export class PdfExtractionSandboxService {
  constructor(private readonly config: ConfigService) {}

  extract(fileKey: string): Promise<string> {
    const timeoutMs = this.config.get<number>(
      'pdfQueue.parseTimeoutMs',
      45_000,
    );
    const memoryLimitMb = this.config.get<number>(
      'pdfQueue.parseMemoryLimitMb',
      192,
    );
    const child = fork(join(__dirname, 'pdf-extraction.child.js'), [], {
      execArgv: [`--max-old-space-size=${memoryLimitMb}`],
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    });
    const r2 = {
      accountId: this.config.getOrThrow<string>('r2.accountId'),
      accessKeyId: this.config.getOrThrow<string>('r2.accessKeyId'),
      secretAccessKey: this.config.getOrThrow<string>('r2.secretAccessKey'),
      privateBucketName: this.config.getOrThrow<string>('r2.privateBucketName'),
    };

    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (error?: Error, text?: string) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (child.connected) child.kill('SIGKILL');
        if (error) reject(error);
        else resolve(text!);
      };
      const timeout = setTimeout(
        () => finish(new PdfExtractionSandboxError('PDF_PARSE_TIMEOUT')),
        timeoutMs,
      );
      child.once('error', () =>
        finish(new PdfExtractionSandboxError('PDF_PARSE_FAILED')),
      );
      child.once('exit', (code) => {
        if (!settled && code !== 0)
          finish(new PdfExtractionSandboxError('PDF_PARSE_FAILED'));
      });
      child.on('message', (message: { ok: boolean; text?: string }) => {
        if (message.ok && typeof message.text === 'string')
          finish(undefined, message.text);
        else finish(new PdfExtractionSandboxError('PDF_PARSE_FAILED'));
      });
      child.send({ fileKey, r2 });
    });
  }
}

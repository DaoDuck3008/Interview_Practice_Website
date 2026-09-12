import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PDFParse } from 'pdf-parse';
import {
  MAX_CV_PAGES,
  MAX_CV_TEXT_LENGTH,
  MIN_CV_TEXT_LENGTH,
} from './mock-cv.constants';
import { redactMockCvText } from './mock-cv-profile.utils';

/**
 * Entry point của child process cô lập: tải, parse và che PII cho một PDF duy nhất.
 * Nếu vượt timeout hoặc heap, parent sẽ dừng riêng process này mà không ảnh hưởng API/queue.
 */
process.on(
  'message',
  async (message: {
    fileKey: string;
    r2: {
      accountId: string;
      accessKeyId: string;
      secretAccessKey: string;
      privateBucketName: string;
    };
  }) => {
    try {
      const client = new S3Client({
        region: 'auto',
        endpoint: `https://${message.r2.accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: message.r2.accessKeyId,
          secretAccessKey: message.r2.secretAccessKey,
        },
      });
      const result = await client.send(
        new GetObjectCommand({
          Bucket: message.r2.privateBucketName,
          Key: message.fileKey,
        }),
      );
      if (!result.Body) throw new Error('EMPTY_PDF');
      const parser = new PDFParse({
        data: Buffer.from(await result.Body.transformToByteArray()),
      });
      try {
        const info = await parser.getInfo();
        if (info.total > MAX_CV_PAGES) throw new Error('TOO_MANY_PAGES');
        const text = redactMockCvText((await parser.getText()).text).slice(
          0,
          MAX_CV_TEXT_LENGTH,
        );
        if (text.length < MIN_CV_TEXT_LENGTH)
          throw new Error('INSUFFICIENT_TEXT');
        process.send?.({ ok: true, text });
      } finally {
        await parser.destroy();
      }
    } catch {
      process.send?.({ ok: false });
    }
  },
);

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { Readable } from 'stream';

@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly privateBucket: string;
  private readonly publicUrl: string;
  private readonly logger = new Logger(StorageService.name);

  constructor(private config: ConfigService) {
    const accountId = this.config.getOrThrow<string>('r2.accountId');
    this.bucket = this.config.getOrThrow<string>('r2.bucketName');
    this.privateBucket = this.config.getOrThrow<string>(
      'r2.privateBucketName',
    );
    this.publicUrl = this.config
      .getOrThrow<string>('r2.publicUrl')
      .replace(/\/$/, '');

    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: this.config.getOrThrow<string>('r2.accessKeyId'),
        secretAccessKey: this.config.getOrThrow<string>('r2.secretAccessKey'),
      },
    });
  }

  /**
   * Upload a Buffer or Readable stream. Returns the public URL.
   * Use for small files (< 5 MB). For larger audio use uploadStream.
   */
  async upload(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<string> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return `${this.publicUrl}/${key}`;
  }

  /**
   * Multipart upload for larger files (audio recordings, etc.).
   * Accepts Buffer or Readable. Returns the public URL.
   */
  async uploadStream(
    key: string,
    body: Buffer | Readable,
    contentType: string,
  ): Promise<string> {
    const upload = new Upload({
      client: this.s3,
      params: {
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      },
    });

    await upload.done();
    return `${this.publicUrl}/${key}`;
  }

  async delete(key: string): Promise<void> {
    return this.deleteFromBucket(this.bucket, key);
  }

  /** Upload object không có public URL, dùng cho tài liệu chứa dữ liệu cá nhân như CV. */
  async uploadPrivate(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.privateBucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  /** Chỉ backend đọc object private qua S3 API; không tạo URL public cho client. */
  async downloadPrivate(key: string): Promise<Buffer> {
    const result = await this.s3.send(
      new GetObjectCommand({ Bucket: this.privateBucket, Key: key }),
    );
    if (!result.Body) {
      throw new Error(`Object private không có nội dung: ${key}`);
    }
    return Buffer.from(await result.Body.transformToByteArray());
  }

  async deletePrivate(key: string): Promise<void> {
    return this.deleteFromBucket(this.privateBucket, key);
  }

  private async deleteFromBucket(bucket: string, key: string): Promise<void> {
    try {
      await this.s3.send(
        new DeleteObjectCommand({ Bucket: bucket, Key: key }),
      );
    } catch (err) {
      this.logger.warn(`Không thể xóa object ${key}: ${String(err)}`);
    }
  }

  /** Extract the R2 object key from a full public URL. */
  keyFromUrl(url: string): string {
    return url.replace(`${this.publicUrl}/`, '');
  }
}

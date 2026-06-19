import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

/*
MIME is the identification of file type. (For example: audio/webm, audio/mp3, video/mp4)

fileFilter is a file filter. It takes 3 arguments:
- req: request
- file: file being uploaded
- cb: callback function

In cb, there are 3 arguments:
- null, true: accept file
- null, false: reject file
- cb(new Error('message'), false): reject file with error message

*/

interface FileUploadConfig {
  /** Accept any mime starting with this prefix, e.g. 'audio/'. */
  mimePrefix?: string;
  /** Accept only these exact mimes, e.g. ['image/png', 'image/webp']. */
  mimeList?: string[];
  /** Max file size in bytes. */
  maxSize: number;
  /** Vietnamese error message when the mime type is rejected. */
  errorMessage?: string;
}

/**
 * Build FileInterceptor options with a mime-type filter and size limit.
 * The `limits` check rejects oversized files during streaming (before they
 * are fully buffered into memory).
 */
export function fileUploadOptions({
  mimePrefix,
  mimeList,
  maxSize,
  errorMessage = 'Định dạng file không hợp lệ.',
}: FileUploadConfig): MulterOptions {
  return {
    limits: { fileSize: maxSize },
    fileFilter: (_req, file, cb) => {
      const allowed = mimePrefix
        ? file.mimetype.startsWith(mimePrefix)
        : (mimeList?.includes(file.mimetype) ?? false);

      if (allowed) {
        cb(null, true);
      } else {
        cb(new BadRequestException(errorMessage), false);
      }
    },
  };
}

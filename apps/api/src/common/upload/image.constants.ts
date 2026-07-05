// Định dạng & dung lượng ảnh cho phép upload (dùng chung cho các endpoint nhận ảnh).
export const ALLOWED_IMAGE_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

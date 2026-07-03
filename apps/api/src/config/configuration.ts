import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3001),
  DATABASE_URL: Joi.string().required(),
  JWT_ACCESS_SECRET: Joi.string().required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  GOOGLE_CLIENT_ID: Joi.string().required(),
  REDIS_URL: Joi.string().default('redis://localhost:6380'),
  FRONTEND_URL: Joi.string().default('http://localhost:3000'),
  R2_ACCOUNT_ID: Joi.string().required(),
  R2_ACCESS_KEY_ID: Joi.string().required(),
  R2_SECRET_ACCESS_KEY: Joi.string().required(),
  R2_BUCKET_NAME: Joi.string().required(),
  R2_PUBLIC_URL: Joi.string().required(),
  GROQ_API_KEY: Joi.string().required(),
  DEEPSEEK_API_KEY: Joi.string().required(),
  SEPAY_WEBHOOK_SECRET: Joi.string().allow('').default(''),
  SEPAY_BANK_ACCOUNT: Joi.string().default(''),
  SEPAY_BANK_CODE: Joi.string().default(''),
  SEPAY_ACCOUNT_NAME: Joi.string().default(''),
  SEPAY_API_KEY: Joi.string().allow('').default(''), // Userapi token để đối soát
  RESEND_API_KEY: Joi.string().allow('').default(''),
  MAIL_FROM: Joi.string().default('InterviewPrep <onboarding@resend.dev>'),
  AI_QUEUE_CONCURRENCY: Joi.number().default(3),
});

export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
  },
  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6380',
  },
  frontendUrl: process.env.FRONTEND_URL,
  r2: {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucketName: process.env.R2_BUCKET_NAME,
    publicUrl: process.env.R2_PUBLIC_URL,
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY,
  },
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY,
  },
  sepay: {
    webhookSecret: process.env.SEPAY_WEBHOOK_SECRET ?? '',
    bankAccount: process.env.SEPAY_BANK_ACCOUNT ?? '0353102705',
    bankCode: process.env.SEPAY_BANK_CODE ?? 'MBBank',
    accountName: process.env.SEPAY_ACCOUNT_NAME ?? 'DAO ANH DUC',
    apiToken: process.env.SEPAY_API_KEY ?? '',
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY ?? '',
    mailFrom: process.env.MAIL_FROM ?? 'InterviewPrep <onboarding@resend.dev>',
  },
  aiQueue: {
    // Số job score/improve tối đa xử lý song song trên toàn hệ thống — nút
    // kiểm soát tải/chi phí AI ở cấp hệ thống, khác ConcurrencyInterceptor
    // (chỉ giới hạn theo từng user riêng lẻ).
    concurrency: parseInt(process.env.AI_QUEUE_CONCURRENCY ?? '3', 10),
  },
});

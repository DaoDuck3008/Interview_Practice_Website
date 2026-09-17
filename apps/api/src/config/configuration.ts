import * as Joi from 'joi';

function requireHttpsOrigin(value: string, helpers: Joi.CustomHelpers) {
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.hostname === 'localhost' ||
      url.pathname !== '/' ||
      url.search ||
      url.hash ||
      url.username ||
      url.password
    ) {
      return helpers.message({
        custom:
          '{{#label}} ở production phải là HTTPS origin hợp lệ, không có path/query.',
      });
    }
    return value;
  } catch {
    return helpers.message({ custom: '{{#label}} không phải URL hợp lệ.' });
  }
}

function requireDatabaseTls(value: string, helpers: Joi.CustomHelpers) {
  try {
    const url = new URL(value);
    const sslMode = url.searchParams.get('sslmode')?.toLowerCase();
    if (
      !['require', 'verify-ca', 'verify-full'].includes(sslMode ?? '') &&
      url.searchParams.get('ssl') !== 'true'
    ) {
      return helpers.message({
        custom:
          '{{#label}} ở production phải bật TLS bằng sslmode=require (hoặc mạnh hơn).',
      });
    }
    return value;
  } catch {
    return helpers.message({ custom: '{{#label}} không phải URL hợp lệ.' });
  }
}

function requireRedisTlsAndPassword(value: string, helpers: Joi.CustomHelpers) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'rediss:' || !url.password) {
      return helpers.message({
        custom: '{{#label}} ở production phải dùng rediss:// và có password.',
      });
    }
    return value;
  } catch {
    return helpers.message({ custom: '{{#label}} không phải URL hợp lệ.' });
  }
}

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3001),
  DATABASE_URL: Joi.string()
    .required()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string().custom(requireDatabaseTls),
    }),
  JWT_ACCESS_SECRET: Joi.string()
    .required()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string().min(32),
    }),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string()
    .required()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string().min(32),
    }),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  GOOGLE_CLIENT_ID: Joi.string().required(),
  REDIS_URL: Joi.string()
    .default('redis://localhost:6380')
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string().custom(requireRedisTlsAndPassword),
    }),
  HEALTH_DEPENDENCY_TIMEOUT_MS: Joi.number()
    .integer()
    .min(500)
    .max(10_000)
    .default(2_000),
  GRACEFUL_SHUTDOWN_TIMEOUT_MS: Joi.number()
    .integer()
    .min(1_000)
    .max(120_000)
    .default(30_000),
  TRUST_PROXY: Joi.string().allow('').default(''),
  FRONTEND_URL: Joi.string()
    .default('http://localhost:3000')
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string().custom(requireHttpsOrigin),
    }),
  R2_ACCOUNT_ID: Joi.string().required(),
  R2_ACCESS_KEY_ID: Joi.string().required(),
  R2_SECRET_ACCESS_KEY: Joi.string().required(),
  R2_BUCKET_NAME: Joi.string().required(),
  R2_PRIVATE_BUCKET_NAME: Joi.string().required(),
  R2_PUBLIC_URL: Joi.string()
    .required()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string().custom(requireHttpsOrigin),
    }),
  GROQ_API_KEY: Joi.string().required(),
  GROQ_TRANSCRIPTION_MODEL: Joi.string().default('whisper-large-v3-turbo'),
  DEEPSEEK_API_KEY: Joi.string().required(),
  DEEPSEEK_DAILY_INPUT_TOKEN_LIMIT: Joi.number()
    .integer()
    .min(1_000)
    .default(3_000_000),
  DEEPSEEK_DAILY_OUTPUT_TOKEN_LIMIT: Joi.number()
    .integer()
    .min(1_000)
    .default(800_000),
  DEEPSEEK_MAX_OUTPUT_TOKENS_PER_REQUEST: Joi.number()
    .integer()
    .min(1)
    .max(16_000)
    .default(2_000),
  EXPLANATION_GLOBAL_DAILY_LIMIT: Joi.number().integer().min(1).default(500),
  EXPLANATION_GLOBAL_CONCURRENCY: Joi.number()
    .integer()
    .min(1)
    .max(20)
    .default(5),
  SEPAY_WEBHOOK_SECRET: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(32).required(),
    otherwise: Joi.string().allow('').default(''),
  }),
  SEPAY_WEBHOOK_MAX_AGE_SECONDS: Joi.number()
    .integer()
    .min(60)
    .max(900)
    .default(300),
  SEPAY_BANK_ACCOUNT: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(1).required(),
    otherwise: Joi.string().allow('').default(''),
  }),
  SEPAY_BANK_CODE: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(1).required(),
    otherwise: Joi.string().allow('').default(''),
  }),
  SEPAY_ACCOUNT_NAME: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(1).required(),
    otherwise: Joi.string().allow('').default(''),
  }),
  SEPAY_API_KEY: Joi.string().allow('').default(''), // Userapi token để đối soát
  RESEND_API_KEY: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(1).required(),
    otherwise: Joi.string().allow('').default(''),
  }),
  MAIL_FROM: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(1).required(),
    otherwise: Joi.string().default('Phỏng vấn IT <onboarding@resend.dev>'),
  }),
  AI_QUEUE_CONCURRENCY: Joi.number().default(5),
  PDF_QUEUE_CONCURRENCY: Joi.number().min(1).max(2).default(2),
  PDF_PARSE_TIMEOUT_MS: Joi.number().min(5_000).max(120_000).default(45_000),
  PDF_PARSE_MEMORY_LIMIT_MB: Joi.number().min(96).max(512).default(192),
}).custom((env, helpers) => {
  if (
    env.NODE_ENV === 'production' &&
    env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET
  ) {
    return helpers.message({
      custom:
        'JWT_ACCESS_SECRET và JWT_REFRESH_SECRET ở production phải khác nhau.',
    });
  }
  return env;
});

export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
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
  health: {
    dependencyTimeoutMs: parseInt(
      process.env.HEALTH_DEPENDENCY_TIMEOUT_MS ?? '2000',
      10,
    ),
    gracefulShutdownTimeoutMs: parseInt(
      process.env.GRACEFUL_SHUTDOWN_TIMEOUT_MS ?? '30000',
      10,
    ),
  },
  trustProxy: process.env.TRUST_PROXY ?? '',
  frontendUrl: process.env.FRONTEND_URL,
  r2: {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucketName: process.env.R2_BUCKET_NAME,
    privateBucketName: process.env.R2_PRIVATE_BUCKET_NAME,
    publicUrl: process.env.R2_PUBLIC_URL,
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    transcriptionModel:
      process.env.GROQ_TRANSCRIPTION_MODEL ?? 'whisper-large-v3-turbo',
  },
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY,
    dailyInputTokenLimit: parseInt(
      process.env.DEEPSEEK_DAILY_INPUT_TOKEN_LIMIT ?? '3000000',
      10,
    ),
    dailyOutputTokenLimit: parseInt(
      process.env.DEEPSEEK_DAILY_OUTPUT_TOKEN_LIMIT ?? '800000',
      10,
    ),
    maxOutputTokensPerRequest: parseInt(
      process.env.DEEPSEEK_MAX_OUTPUT_TOKENS_PER_REQUEST ?? '2000',
      10,
    ),
  },
  explanation: {
    globalDailyLimit: parseInt(
      process.env.EXPLANATION_GLOBAL_DAILY_LIMIT ?? '500',
      10,
    ),
    globalConcurrency: parseInt(
      process.env.EXPLANATION_GLOBAL_CONCURRENCY ?? '5',
      10,
    ),
  },
  sepay: {
    webhookSecret: process.env.SEPAY_WEBHOOK_SECRET ?? '',
    webhookMaxAgeSeconds: parseInt(
      process.env.SEPAY_WEBHOOK_MAX_AGE_SECONDS ?? '300',
      10,
    ),
    bankAccount: process.env.SEPAY_BANK_ACCOUNT ?? '',
    bankCode: process.env.SEPAY_BANK_CODE ?? '',
    accountName: process.env.SEPAY_ACCOUNT_NAME ?? '',
    apiToken: process.env.SEPAY_API_KEY ?? '',
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY ?? '',
    mailFrom: process.env.MAIL_FROM ?? 'Phỏng vấn IT <onboarding@resend.dev>',
  },
  aiQueue: {
    // Số AI job tối đa xử lý song song trên toàn hệ thống — nút
    // kiểm soát tải/chi phí AI ở cấp hệ thống, khác ConcurrencyInterceptor
    // (chỉ giới hạn theo từng user riêng lẻ).
    concurrency: parseInt(process.env.AI_QUEUE_CONCURRENCY ?? '5', 10),
  },
  pdfQueue: {
    concurrency: parseInt(process.env.PDF_QUEUE_CONCURRENCY ?? '2', 10),
    parseTimeoutMs: parseInt(process.env.PDF_PARSE_TIMEOUT_MS ?? '45000', 10),
    parseMemoryLimitMb: parseInt(
      process.env.PDF_PARSE_MEMORY_LIMIT_MB ?? '192',
      10,
    ),
  },
});

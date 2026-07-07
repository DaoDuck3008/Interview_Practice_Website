import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ConfigService } from '@nestjs/config';
import { ConfiguredIoAdapter } from './websocket/websocket.adapter';
import helmet from 'helmet';

const cookieParser = require('cookie-parser');

async function bootstrap() {
  // rawBody: true → giữ lại body thô (Buffer) để verify chữ ký HMAC webhook Sepay.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  // Cho phép onApplicationShutdown chạy (đóng kết nối Redis khi tắt app)
  app.enableShutdownHooks();
  app.use(cookieParser());
  const config = app.get(ConfigService);
  const isProduction = config.get<string>('NODE_ENV') === 'production';

  app.getHttpAdapter().getInstance().disable('x-powered-by'); // tắt header X-Powered-By để tránh lộ thông tin framework
  app.use(
    helmet({
      // CSP
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'none'"], // mặc định chặn mọi loại resource, chỉ cho phép những loại được khai báo riêng
          baseUri: ["'none'"], // chặn thẻ HTML <base> để tránh redirect sang domain khác
          formAction: ["'self'"], // Nếu có form HTML thì chỉ cho submit về chính API này, không cho submit sang domain khác
          frameAncestors: ["'none'"], // chặn việc nhúng API vào frame của domain khác
          objectSrc: ["'none'"], // chặn thẻ <object> để tránh nhúng resource từ domain khác
          scriptSrc: ["'none'"], // chặn script từ domain khác, chỉ cho phép script inline (nếu có) và script từ chính API này
          styleSrc: ["'none'"], // không cho load CSS
          imgSrc: ["'none'"], // không cho load ảnh
          fontSrc: ["'none'"], // không cho load font
          connectSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false, // Tắt COEP để tránh lỗi CORS khi frontend load resource từ domain khác (ví dụ ảnh từ R2/Google)
      crossOriginResourcePolicy: false, // Tắt CORP để tránh lỗi CORS khi frontend load resource từ domain khác (ví dụ ảnh từ R2/Google)
      // Chỉ bật HSTS ở production vì local/dev vẫn chạy HTTP.
      hsts: isProduction
        ? {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
          }
        : false,
    }),
  );

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ResponseInterceptor(),
  );

  app.enableCors({
    origin: config.get('FRONTEND_URL'),
    credentials: true,
  });

  // Cho phép frontend giao tiếp qua websocket
  app.useWebSocketAdapter(new ConfiguredIoAdapter(app));

  const PORT = config.get<string>('PORT') ?? 3001;
  await app.listen(PORT);
  console.log(`Application is running on: http://localhost:${PORT}/api/v1`);
}

bootstrap();

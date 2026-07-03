import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ConfigService } from '@nestjs/config';
import { ConfiguredIoAdapter } from './websocket/websocket.adapter';

const cookieParser = require('cookie-parser');

async function bootstrap() {
  // rawBody: true → giữ lại body thô (Buffer) để verify chữ ký HMAC webhook Sepay.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  // Cho phép onApplicationShutdown chạy (đóng kết nối Redis khi tắt app)
  app.enableShutdownHooks();
  app.use(cookieParser());
  const config = app.get(ConfigService);

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

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ConfigService } from '@nestjs/config';

const cookieParser = require('cookie-parser');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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

  app.useGlobalInterceptors(new LoggingInterceptor(), new ResponseInterceptor());

  app.enableCors({
    origin: config.get('FRONTEND_URL'),
    credentials: true,
  });

  const PORT = config.get<string>('PORT') ?? 3001;
  await app.listen(PORT);
  console.log(`Application is running on: http://localhost:${PORT}/api/v1`);
}

bootstrap();

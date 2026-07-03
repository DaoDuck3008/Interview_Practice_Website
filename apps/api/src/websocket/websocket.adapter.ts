import { INestApplicationContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';

/**
 * `@WebSocketGateway({ cors: ... })` nhận option cors NGAY LÚC decorator được
 * đọc — tức trước khi ConfigModule kịp nạp .env vào process.env (import của
 * app.module.ts luôn chạy xong trước khi ConfigModule.forRoot() bên trong nó
 * thực thi). Vì vậy không cấu hình cors ở decorator, mà override tại đây —
 * chạy sau khi Nest đã bootstrap xong, ConfigService đã có giá trị thật.
 * Mirror đúng cách main.ts đang cấu hình CORS cho HTTP (`app.enableCors`).
 */
export class ConfiguredIoAdapter extends IoAdapter {
  constructor(private app: INestApplicationContext) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions) {
    const config = this.app.get(ConfigService);
    return super.createIOServer(port, {
      ...options,
      cors: {
        origin: config.get('FRONTEND_URL'),
        credentials: true,
      },
    });
  }
}

import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import configuration, { validationSchema } from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { BullMqModule } from './queue/bullmq.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TopicsModule } from './modules/topics/topics.module';
import { QuestionsModule } from './modules/questions/questions.module';
import { StorageModule } from './modules/storage/storage.module';
import { SpeechModule } from './modules/speech/speech.module';
import { ScoreModule } from './modules/scoring/score.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { PlansModule } from './modules/plans/plans.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { QuotaModule } from './modules/quota/quota.module';
import { SupportModule } from './modules/support/support.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { AuditModule } from './modules/audit/audit.module';
import { MockInterviewsModule } from './modules/mock-interviews/mock-interviews.module';
import { WebsocketModule } from './websocket/websocket.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AppThrottlerGuard } from './common/throttling/app-throttler.guard';
import { RedisThrottlerStorage } from './common/throttling/redis-throttler.storage';
import { ThrottlingModule } from './common/throttling/throttling.module';
import { AuditInterceptor } from './modules/audit/audit.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),
    ThrottlingModule,
    ThrottlerModule.forRootAsync({
      inject: [RedisThrottlerStorage],
      useFactory: (storage: RedisThrottlerStorage) => ({
        storage,
        errorMessage:
          'Bạn thao tác quá nhanh. Vui lòng chờ một chút rồi thử lại.',
        throttlers: [
          {
            name: 'default',
            ttl: 60_000,
            limit: 120,
            blockDuration: 60_000,
          },
        ],
      }),
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    BullMqModule,
    AuthModule,
    UsersModule,
    TopicsModule,
    QuestionsModule,
    StorageModule,
    SpeechModule,
    ScoreModule,
    SessionsModule,
    PlansModule,
    PaymentsModule,
    SubscriptionsModule,
    QuotaModule,
    SupportModule,
    WebsocketModule,
    FavoritesModule,
    AuditModule,
    MockInterviewsModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}

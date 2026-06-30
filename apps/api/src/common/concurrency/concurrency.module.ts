import { Module } from '@nestjs/common';
import { ConcurrencyInterceptor } from './concurrency.interceptor';

/**
 * Cung cấp 1 instance ConcurrencyInterceptor dùng chung (counter in-flight phải
 * là singleton để đếm đúng trên các endpoint khác module). Module nào cần thì
 * import module này rồi gắn @UseInterceptors(ConcurrencyInterceptor).
 */
@Module({
  providers: [ConcurrencyInterceptor],
  exports: [ConcurrencyInterceptor],
})
export class ConcurrencyModule {}

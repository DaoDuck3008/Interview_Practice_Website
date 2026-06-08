import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  HttpException,
} from '@nestjs/common';
import { Observable, tap, catchError, throwError } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const { method, url, ip } = request;

    return next.handle().pipe(
      tap(() => {
        this.logger.log(
          `${method} ${url} ${response.statusCode} - ${Date.now() - now}ms - IP: ${ip}`,
        );
      }),
      catchError((err) => {
        // response.statusCode chưa được set khi có lỗi (HttpExceptionFilter xử lý sau)
        // nên phải lấy status từ exception object
        const statusCode =
          err instanceof HttpException ? err.getStatus() : 500;
        const message = err?.message ?? 'Unknown error';
        this.logger.error(
          `${method} ${url} ${statusCode} - ${Date.now() - now}ms - IP: ${ip} | ${message}`,
          err?.stack,
        );
        return throwError(() => err);
      }),
    );
  }
}

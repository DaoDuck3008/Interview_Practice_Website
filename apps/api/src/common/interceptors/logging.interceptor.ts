import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  HttpException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { Observable, tap, catchError, throwError } from 'rxjs';
import {
  redactSensitiveLogData,
  requestPathWithoutQuery,
} from '../utils/log-redaction.util';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const { method, ip } = request;
    const path = requestPathWithoutQuery(request);
    const requestId = randomUUID();
    response.setHeader('X-Request-Id', requestId);

    return next.handle().pipe(
      tap(() => {
        this.logger.log(
          `[${requestId}] ${method} ${path} ${response.statusCode} - ${Date.now() - now}ms - IP: ${ip}`,
        );
      }),
      catchError((err) => {
        // response.statusCode chưa được set khi có lỗi (HttpExceptionFilter xử lý sau)
        // nên phải lấy status từ exception object
        const statusCode =
          err instanceof HttpException ? err.getStatus() : 500;
        const message = redactSensitiveLogData(
          err instanceof Error ? err.message : String(err),
        );
        this.logger.error(
          `[${requestId}] ${method} ${path} ${statusCode} - ${Date.now() - now}ms - IP: ${ip} | ${message}`,
          redactSensitiveLogData(err instanceof Error ? err.stack ?? '' : ''),
        );
        return throwError(() => err);
      }),
    );
  }
}

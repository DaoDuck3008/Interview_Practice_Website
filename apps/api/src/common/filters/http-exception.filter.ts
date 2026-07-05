import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly configService: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isDev =
      this.configService.get<string>('NODE_ENV') === 'development';

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Máy chủ đang bận, vui lòng thử lại sau!';
    let errors: any = null;
    let errorCode = 'INTERNAL_SERVER_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (exceptionResponse && typeof exceptionResponse === 'object') {
        const res = exceptionResponse as any;

        if (Array.isArray(res.message)) {
          message = 'Validation failed';
          errors = res.message;
        } else {
          message = res.message || message;
        }

        errorCode = res.errorCode || res.error || errorCode;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Map các mã lỗi Prisma hay gặp sang status/errorCode rõ ràng thay vì rơi vào 500 chung chung
      switch (exception.code) {
        case 'P2002': {
          const target = (exception.meta?.target as string[] | undefined)?.join(', ');
          status = HttpStatus.CONFLICT;
          errorCode = 'UNIQUE_CONSTRAINT_VIOLATION';
          message = target ? `Giá trị "${target}" đã tồn tại` : 'Dữ liệu đã tồn tại';
          break;
        }
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          errorCode = 'NOT_FOUND';
          message = 'Không tìm thấy bản ghi';
          break;
        case 'P2003':
          status = HttpStatus.CONFLICT;
          errorCode = 'FOREIGN_KEY_CONSTRAINT_VIOLATION';
          message = 'Dữ liệu đang được tham chiếu bởi bản ghi khác';
          break;
        default:
          status = HttpStatus.BAD_REQUEST;
          errorCode = `PRISMA_${exception.code}`;
          message = 'Yêu cầu không hợp lệ';
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const responseBody = {
      success: false,
      statusCode: status,
      errorCode: errorCode.toString().toUpperCase().replace(/\s+/g, '_'),
      message,
      errors,
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
      method: request.method,
      stack: isDev ? (exception as any)?.stack : undefined,
    };

    this.logger.error(
      `${request.method} ${request.originalUrl} ${status} - ${message}`,
      isDev ? (exception as any)?.stack : '',
    );

    response.status(status).json(responseBody);
  }
}

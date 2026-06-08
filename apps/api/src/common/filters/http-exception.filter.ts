import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    let message = 'Máy chủ đang bận, vui lòng thử lại sau!';
    let errors: any = null;
    let errorCode = 'INTERNAL_SERVER_ERROR';

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

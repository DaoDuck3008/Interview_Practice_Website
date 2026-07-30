import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuditActorType, Role } from '@prisma/client';
import { catchError, from, mergeMap, tap, throwError } from 'rxjs';
import { AUDIT_METADATA_KEY } from './audit.constants';
import { AuditService } from './audit.service';
import {
  AuditMetadata,
  AuditRequest,
  AuditResolverContext,
  AuditValueResolver,
} from './audit.types';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private audit: AuditService,
  ) {}

  // Bao quanh request HTTP có @Audit: chụp before, cho handler chạy, rồi ghi log.
  intercept(context: ExecutionContext, next: CallHandler) {
    const metadata = this.reflector.getAllAndOverride<AuditMetadata>(
      AUDIT_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!metadata || context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuditRequest>();
    // captureBefore là async, nên đưa vào RxJS pipeline bằng from() để nó chạy
    // trước handler. mergeMap giữ cho response/error của handler tiếp tục đi bình thường.
    return from(this.captureBefore(metadata, request)).pipe(
      mergeMap((before) =>
        next.handle().pipe(
          tap((response) => {
            void this.writeLog(metadata, { request, response, before }, true);
          }),
          catchError((error) => {
            void this.writeLog(metadata, { request, error, before }, false);
            return throwError(() => error);
          }),
        ),
      ),
    );
  }

  // Lấy snapshot trước khi thay đổi để audit có dữ liệu before/after.
  private async captureBefore(metadata: AuditMetadata, request: AuditRequest) {
    // GET chỉ đọc dữ liệu, không cần before snapshot và cũng tránh query DB thừa.
    if (request.method === 'GET') return undefined;
    const entityId = this.resolve(metadata.entityId, { request });
    if (!entityId) return undefined;
    return this.audit.snapshot(metadata.entityType, String(entityId));
  }

  // Gom ngữ cảnh request/response/error thành một dòng AuditLog.
  private async writeLog(
    metadata: AuditMetadata,
    context: AuditResolverContext,
    success: boolean,
  ) {
    const request = context.request;
    const actorType =
      request.user?.role === Role.ADMIN ? AuditActorType.ADMIN : AuditActorType.USER;
    // Luôn gom params/query/body để sau này tra cứu được request đã tác động bằng input nào.
    // AuditService.sanitize sẽ che password/token/code trước khi ghi DB.
    const baseMetadata = {
      params: request.params,
      query: request.query,
      body: request.body,
      // Metadata riêng từ decorator có thể bổ sung thông tin nghiệp vụ như initiatedBy.
      ...(this.resolve(metadata.metadata, context) ?? {}),
    };

    await this.audit.log({
      actorType,
      actorId: request.user?.id ?? null,
      actorEmail: request.user?.email ?? null,
      action: this.resolve(metadata.action, context)!,
      entityType: metadata.entityType,
      entityId: this.resolve(metadata.entityId, context) ?? null,
      targetUserId: this.resolve(metadata.targetUserId, context) ?? null,
      method: request.method,
      path: request.originalUrl ?? request.url,
      ip: request.ip,
      userAgent: request.headers['user-agent'] ?? null,
      before: this.audit.sanitize(context.before),
      // after chỉ lấy từ response khi handler thành công; request lỗi thì chỉ ghi errorCode.
      // Một số màn admin cần audit hành động xem dữ liệu nhạy cảm, nhưng không được copy
      // transcript/audio vào AuditLog. Vẫn giữ actor, entity, URL và metadata để truy vết.
      after:
        success && !metadata.omitResponse
          ? this.audit.sanitize(context.response)
          : undefined,
      metadata: this.audit.sanitize(baseMetadata),
      success,
      errorCode: success ? null : this.errorCode(context.error),
    });
  }

  // Chạy resolver trong @Audit, hoặc trả về giá trị tĩnh nếu không phải function.
  private resolve<T>(
    resolver: AuditValueResolver<T> | undefined,
    context: AuditResolverContext,
  ) {
    // @Audit cho phép truyền giá trị tĩnh hoặc function phụ thuộc request/response.
    if (typeof resolver === 'function') {
      return (resolver as (ctx: AuditResolverContext) => T | null | undefined)(
        context,
      );
    }
    return resolver;
  }

  // Rút ra mã lỗi ngắn gọn để audit request thất bại, giúp tra cứu nhanh.
  private errorCode(error: unknown) {
    if (!error || typeof error !== 'object') return null;
    const response =
      'getResponse' in error
        ? (error as { getResponse?: () => unknown }).getResponse?.()
        : undefined;
    // Một số exception custom trả về errorCode trong body, ưu tiên mã này hơn tên class.
    if (response && typeof response === 'object' && 'errorCode' in response) {
      return String((response as { errorCode?: unknown }).errorCode);
    }
    if ('name' in error) return String((error as { name?: unknown }).name);
    return null;
  }
}

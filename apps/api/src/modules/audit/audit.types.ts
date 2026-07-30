import { Request } from 'express';
import { AuditAction, AuditActorType, Prisma, Role } from '@prisma/client';

export type AuditRequest = Request & {
  user?: {
    id?: string;
    email?: string;
    role?: Role | string;
  };
};

export type AuditResolverContext = {
  request: AuditRequest;
  response?: unknown;
  error?: unknown;
  before?: unknown;
};

export type AuditValueResolver<T> =
  | T
  | ((context: AuditResolverContext) => T | null | undefined);

export type AuditMetadata = {
  action: AuditValueResolver<AuditAction>;
  entityType: string;
  entityId?: AuditValueResolver<string>;
  targetUserId?: AuditValueResolver<string>;
  metadata?: AuditValueResolver<Record<string, unknown>>;
  /** Không lưu body response khi response có dữ liệu nhạy cảm như transcript/audio. */
  omitResponse?: boolean;
};

export type AuditLogInput = {
  actorType: AuditActorType;
  actorId?: string | null;
  actorEmail?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  targetUserId?: string | null;
  method?: string | null;
  path?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  before?: Prisma.InputJsonValue | null;
  after?: Prisma.InputJsonValue | null;
  metadata?: Prisma.InputJsonValue | null;
  success?: boolean;
  errorCode?: string | null;
};

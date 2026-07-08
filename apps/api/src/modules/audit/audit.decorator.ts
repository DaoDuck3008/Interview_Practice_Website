import { SetMetadata } from '@nestjs/common';
import { AUDIT_METADATA_KEY } from './audit.constants';
import { AuditMetadata } from './audit.types';

export const Audit = (metadata: AuditMetadata) =>
  SetMetadata(AUDIT_METADATA_KEY, metadata);

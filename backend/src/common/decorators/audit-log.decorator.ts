import { SetMetadata } from '@nestjs/common';
import { AuditAction, AuditResourceType } from '../entities/audit-log.entity';

export const AUDIT_LOG_METADATA = 'audit_log_metadata';

export interface AuditLogOptions {
  action?: AuditAction;
  resourceType?: AuditResourceType;
  description?: string;
}

/**
 * Decorator for explicitly marking a controller method for audit logging.
 * The AuditLogInterceptor reads this metadata to override inferred values.
 *
 * @example
 * @AuditLog({ action: AuditAction.APPROVE, resourceType: AuditResourceType.CLAIM, description: 'Admin approved claim' })
 * @Post(':id/approve')
 * async approveClaim(@Param('id') id: string) { ... }
 */
export const AuditLog = (options: AuditLogOptions = {}) =>
  SetMetadata(AUDIT_LOG_METADATA, options);

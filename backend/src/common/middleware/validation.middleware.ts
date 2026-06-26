import {
  Injectable,
  NestMiddleware,
  BadRequestException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

const ALLOWED_CONTENT_TYPES = [
  'application/json',
  'application/x-www-form-urlencoded',
  'multipart/form-data',
  'text/plain',
];

const MAX_BODY_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
];

@Injectable()
export class RequestValidationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestValidationMiddleware.name);

  use(req: Request, res: Response, next: NextFunction): void {
    try {
      this.validateContentType(req);
      this.validateContentLength(req);
      this.validateQueryParams(req);
      this.validateHeaders(req);
      next();
    } catch (error) {
      next(error);
    }
  }

  private validateContentType(req: Request): void {
    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) return;

    const contentType = req.headers['content-type'];
    if (!contentType) return;

    const baseType = contentType.split(';')[0].trim().toLowerCase();
    const isAllowed = ALLOWED_CONTENT_TYPES.some((allowed) =>
      baseType.startsWith(allowed),
    );

    if (!isAllowed) {
      throw new UnsupportedMediaTypeException(
        `Content-Type '${baseType}' is not supported. Allowed types: ${ALLOWED_CONTENT_TYPES.join(', ')}`,
      );
    }
  }

  private validateContentLength(req: Request): void {
    const contentLength = req.headers['content-length'];
    if (!contentLength) return;

    const size = parseInt(contentLength, 10);
    if (isNaN(size)) return;

    if (size > MAX_BODY_SIZE_BYTES) {
      throw new PayloadTooLargeException(
        `Request body too large. Maximum allowed size is ${MAX_BODY_SIZE_BYTES / 1024 / 1024}MB`,
      );
    }
  }

  private validateQueryParams(req: Request): void {
    const query = req.query;

    for (const [key, value] of Object.entries(query)) {
      if (typeof value === 'string') {
        this.checkForDangerousContent(key, value);

        if (value.length > 1000) {
          throw new BadRequestException(
            `Query parameter '${key}' exceeds maximum length of 1000 characters`,
          );
        }
      }
    }
  }

  private validateHeaders(req: Request): void {
    const suspiciousHeaders = ['x-forwarded-for', 'x-real-ip'];

    for (const header of suspiciousHeaders) {
      const value = req.headers[header];
      if (typeof value === 'string' && value.length > 512) {
        this.logger.warn(`Oversized header '${header}' from ${req.ip}`);
      }
    }

    // Reject requests with null bytes in any header
    for (const [name, value] of Object.entries(req.headers)) {
      const headerStr = Array.isArray(value) ? value.join(',') : (value as string);
      if (headerStr && headerStr.includes('\0')) {
        throw new BadRequestException(`Invalid character in header '${name}'`);
      }
    }
  }

  private checkForDangerousContent(field: string, value: string): void {
    for (const pattern of DANGEROUS_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(value)) {
        this.logger.warn(`Potentially dangerous content in field '${field}'`);
        throw new BadRequestException(
          `Query parameter '${field}' contains invalid content`,
        );
      }
    }
  }
}

import { Injectable, PipeTransform } from '@nestjs/common';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitization Pipe: Recursively sanitizes user-generated content (strings)
 * in DTO objects. Removes XSS vectors and disallowed HTML tags.
 * Uses DOMPurify with strict config to allow only safe tags and attributes.
 */
@Injectable()
export class SanitizePipe implements PipeTransform {
  private readonly config = {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'p', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  };

  transform(value: unknown): unknown {
    return this.sanitize(value);
  }

  private sanitize(value: unknown): unknown {
    if (typeof value === 'string') {
      return DOMPurify.sanitize(value, this.config);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitize(item));
    }

    if (value !== null && typeof value === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = this.sanitize(val);
      }
      return sanitized;
    }

    return value;
  }
}

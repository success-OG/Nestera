import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export enum ErrorCategory {
  AUTH = 'AUTH',
  AUTHZ = 'AUTHZ',
  VAL = 'VAL',
  DB = 'DB',
  RPC = 'RPC',
  RATE = 'RATE',
  SYS = 'SYS',
}

export interface ErrorMetadata {
  code: string;
  httpStatus: number;
  defaultMessage: string;
  localizationKey: string;
  category: ErrorCategory;
  description?: string;
}

@Injectable()
export class ErrorCodeRegistry {
  private readonly logger = new Logger(ErrorCodeRegistry.name);
  private errorMap: Map<string, ErrorMetadata>;

  constructor() {
    this.errorMap = new Map();
    this.loadErrorCodes();
  }

  /**
   * Load error codes from config/error-codes.json
   */
  private loadErrorCodes(): void {
    try {
      const configPath = path.join(__dirname, '../../config/error-codes.json');
      const configFile = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configFile);

      if (config.errorCodes && Array.isArray(config.errorCodes)) {
        config.errorCodes.forEach((error: ErrorMetadata) => {
          this.errorMap.set(error.code, error);
        });
        this.logger.log(`Loaded ${this.errorMap.size} error codes`);
      }
    } catch (error) {
      this.logger.error('Failed to load error codes configuration', error);
      // Initialize with default error codes
      this.initializeDefaultErrorCodes();
    }
  }

  /**
   * Initialize default error codes as fallback
   */
  private initializeDefaultErrorCodes(): void {
    const defaults: ErrorMetadata[] = [
      {
        code: 'SYS_500',
        httpStatus: 500,
        defaultMessage: 'Internal server error',
        localizationKey: 'SYS_500',
        category: ErrorCategory.SYS,
      },
      {
        code: 'SYS_404',
        httpStatus: 404,
        defaultMessage: 'Resource not found',
        localizationKey: 'SYS_404',
        category: ErrorCategory.SYS,
      },
      {
        code: 'AUTH_001',
        httpStatus: 401,
        defaultMessage: 'Authentication required',
        localizationKey: 'AUTH_001',
        category: ErrorCategory.AUTH,
      },
      {
        code: 'VAL_001',
        httpStatus: 400,
        defaultMessage: 'Validation failed',
        localizationKey: 'VAL_001',
        category: ErrorCategory.VAL,
      },
    ];

    defaults.forEach((error) => {
      this.errorMap.set(error.code, error);
    });
  }

  /**
   * Get metadata for an error code
   * Returns default metadata if code not found
   */
  getMetadata(code: string): ErrorMetadata {
    const metadata = this.errorMap.get(code);
    if (metadata) {
      return metadata;
    }

    // Return default metadata for unknown codes
    this.logger.warn(`Error code ${code} not found, using default`);
    return {
      code,
      httpStatus: 500,
      defaultMessage: 'An error occurred',
      localizationKey: code,
      category: ErrorCategory.SYS,
    };
  }

  /**
   * Register a new error code programmatically
   */
  register(metadata: ErrorMetadata): void {
    this.errorMap.set(metadata.code, metadata);
  }

  /**
   * Get all error codes in a category
   */
  getByCategory(category: ErrorCategory): ErrorMetadata[] {
    return Array.from(this.errorMap.values()).filter(
      (error) => error.category === category,
    );
  }

  /**
   * Export all error codes for documentation
   */
  exportToMarkdown(): string {
    const categories = Object.values(ErrorCategory);
    let markdown = '# API Error Codes\n\n';

    categories.forEach((category) => {
      const errors = this.getByCategory(category);
      if (errors.length === 0) return;

      markdown += `## ${this.getCategoryName(category)} (${category})\n\n`;

      errors.forEach((error) => {
        markdown += `### ${error.code}\n`;
        markdown += `- **HTTP Status**: ${error.httpStatus}\n`;
        markdown += `- **Message**: ${error.defaultMessage}\n`;
        if (error.description) {
          markdown += `- **Description**: ${error.description}\n`;
        }
        markdown += '\n';
      });
    });

    return markdown;
  }

  /**
   * Export all error codes as JSON
   */
  exportToJson(): string {
    const categories = Object.values(ErrorCategory);
    const result: Record<string, any> = {
      categories: {},
      totalErrorCodes: this.errorMap.size,
      generatedAt: new Date().toISOString(),
    };

    categories.forEach((category) => {
      const errors = this.getByCategory(category);
      if (errors.length > 0) {
        result.categories[category] = {
          name: this.getCategoryName(category),
          errorCodes: errors,
        };
      }
    });

    return JSON.stringify(result, null, 2);
  }

  private getCategoryName(category: ErrorCategory): string {
    const names: Record<ErrorCategory, string> = {
      [ErrorCategory.AUTH]: 'Authentication',
      [ErrorCategory.AUTHZ]: 'Authorization',
      [ErrorCategory.VAL]: 'Validation',
      [ErrorCategory.DB]: 'Database',
      [ErrorCategory.RPC]: 'Blockchain RPC',
      [ErrorCategory.RATE]: 'Rate Limiting',
      [ErrorCategory.SYS]: 'System',
    };
    return names[category] || category;
  }
}

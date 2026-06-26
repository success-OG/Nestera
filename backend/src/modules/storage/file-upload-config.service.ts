import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Define File type for multer uploads
interface File {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination?: string;
  filename?: string;
  path?: string;
  buffer?: Buffer;
}

/**
 * Configuration for file uploads across the application
 * Handles multer setup, size limits, and virus scanning
 */
@Injectable()
export class FileUploadConfigService {
  readonly defaultMaxSize: number;
  readonly maxAvatarSize: number;
  readonly maxDocumentSize: number;
  readonly maxBackupRestoreSize: number;
  readonly allowedImageTypes: string[];
  readonly allowedDocumentTypes: string[];
  readonly allowedBackupTypes: string[];
  readonly virusScanningEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.defaultMaxSize =
      this.configService.get<number>('upload.defaultMaxSize') ||
      10 * 1024 * 1024; // 10MB
    this.maxAvatarSize =
      this.configService.get<number>('upload.maxAvatarSize') || 5 * 1024 * 1024; // 5MB
    this.maxDocumentSize =
      this.configService.get<number>('upload.maxDocumentSize') ||
      10 * 1024 * 1024; // 10MB
    this.maxBackupRestoreSize =
      this.configService.get<number>('upload.maxBackupRestoreSize') ||
      1024 * 1024 * 1024; // 1GB
    this.allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
    this.allowedDocumentTypes = ['application/pdf', 'image/jpeg'];
    this.allowedBackupTypes = ['application/octet-stream', 'application/gzip'];
    this.virusScanningEnabled =
      this.configService.get<boolean>('upload.virusScanningEnabled') ?? false;
  }

  /**
   * Get multer options for Express/NestJS file uploads
   */
  getMulterOptions(fileType: 'avatar' | 'document' | 'backup' | 'default') {
    let limits = { fileSize: this.defaultMaxSize };

    switch (fileType) {
      case 'avatar':
        limits = { fileSize: this.maxAvatarSize };
        break;
      case 'document':
        limits = { fileSize: this.maxDocumentSize };
        break;
      case 'backup':
        limits = { fileSize: this.maxBackupRestoreSize };
        break;
    }

    return {
      limits,
      fileFilter: this.createFileFilter(fileType),
    };
  }

  /**
   * Create a file filter function for multer
   */
  private createFileFilter(
    fileType: 'avatar' | 'document' | 'backup' | 'default',
  ) {
    return (_req: any, file: any, cb: any) => {
      const allowedTypes = this.getAllowedTypesForFileType(fileType);

      if (allowedTypes.length === 0 || allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(
          new Error(
            `Invalid file type: ${file.mimetype}. Allowed types: ${allowedTypes.join(', ')}`,
          ),
        );
      }
    };
  }

  /**
   * Get allowed MIME types for a file type
   */
  private getAllowedTypesForFileType(
    fileType: 'avatar' | 'document' | 'backup' | 'default',
  ): string[] {
    switch (fileType) {
      case 'avatar':
        return this.allowedImageTypes;
      case 'document':
        return this.allowedDocumentTypes;
      case 'backup':
        return this.allowedBackupTypes;
      default:
        return [];
    }
  }

  /**
   * Validate file before processing
   */
  async validateFile(
    file: File,
    fileType: 'avatar' | 'document' | 'backup' | 'default',
  ): Promise<{ valid: boolean; error?: string }> {
    // Check file size
    const maxSize = this.getMaxSizeForFileType(fileType);
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size exceeds limit of ${maxSize / 1024 / 1024}MB`,
      };
    }

    // Check MIME type
    const allowedTypes = this.getAllowedTypesForFileType(fileType);
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
      return {
        valid: false,
        error: `Invalid file type: ${file.mimetype}`,
      };
    }

    // Virus scanning (if enabled)
    if (this.virusScanningEnabled) {
      try {
        const isClean = await this.scanForViruses(file);
        if (!isClean) {
          return {
            valid: false,
            error: 'File failed virus scan',
          };
        }
      } catch (error) {
        return {
          valid: false,
          error: `Virus scan failed: ${(error as Error).message}`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Scan file for viruses using ClamAV or similar service
   * Placeholder implementation - integrate with actual virus scanner
   */
  private async scanForViruses(_file: File): Promise<boolean> {
    // TODO: Integrate with ClamAV or VirusTotal API
    // For now, always return true (file is clean)
    return true;
  }

  /**
   * Get max size for file type
   */
  private getMaxSizeForFileType(
    fileType: 'avatar' | 'document' | 'backup' | 'default',
  ): number {
    switch (fileType) {
      case 'avatar':
        return this.maxAvatarSize;
      case 'document':
        return this.maxDocumentSize;
      case 'backup':
        return this.maxBackupRestoreSize;
      default:
        return this.defaultMaxSize;
    }
  }
}

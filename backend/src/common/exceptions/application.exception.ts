import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Custom application exception with error code support
 */
export class ApplicationException extends HttpException {
  constructor(
    public readonly errorCode: string,
    messageOrStatus?: string | number,
    public readonly context: Record<string, unknown> = {},
  ) {
    const message =
      typeof messageOrStatus === 'string' ? messageOrStatus : errorCode;
    const status =
      typeof messageOrStatus === 'number'
        ? messageOrStatus
        : HttpStatus.INTERNAL_SERVER_ERROR;

    super(message, status);
  }

  /**
   * Add contextual information (method chaining)
   */
  withContext(key: string, value: unknown): this {
    this.context[key] = value;
    return this;
  }

  /**
   * Get error code
   */
  getErrorCode(): string {
    return this.errorCode;
  }

  /**
   * Get context data
   */
  getContext(): Record<string, unknown> {
    return this.context || {};
  }
}

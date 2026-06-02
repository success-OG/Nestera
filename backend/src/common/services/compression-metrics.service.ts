import { Injectable } from '@nestjs/common';
import { Response } from 'express';

export interface CompressionMetrics {
  totalResponses: number;
  compressedResponses: number;
  uncompressedResponses: number;
  totalBytesSent: number;
  bytesSentWithCompression: number;
  averageResponseSizeBytes: number;
  compressedResponseRatio: number;
}

@Injectable()
export class CompressionMetricsService {
  private totalResponses = 0;
  private compressedResponses = 0;
  private uncompressedResponses = 0;
  private totalBytesSent = 0;
  private bytesSentWithCompression = 0;

  recordResponse(response: Response, bytesWritten: number): void {
    this.totalResponses += 1;
    this.totalBytesSent += bytesWritten;

    const contentEncoding =
      String(response.getHeader('content-encoding') || '').toLowerCase();
    if (contentEncoding.includes('gzip') || contentEncoding.includes('br')) {
      this.compressedResponses += 1;
      this.bytesSentWithCompression += bytesWritten;
    } else {
      this.uncompressedResponses += 1;
    }
  }

  getMetrics(): CompressionMetrics {
    return {
      totalResponses: this.totalResponses,
      compressedResponses: this.compressedResponses,
      uncompressedResponses: this.uncompressedResponses,
      totalBytesSent: this.totalBytesSent,
      bytesSentWithCompression: this.bytesSentWithCompression,
      averageResponseSizeBytes:
        this.totalResponses > 0
          ? Math.round(this.totalBytesSent / this.totalResponses)
          : 0,
      compressedResponseRatio:
        this.totalResponses > 0
          ? Number(
              ((this.compressedResponses / this.totalResponses) * 100).toFixed(
                2,
              ),
            )
          : 0,
    };
  }
}

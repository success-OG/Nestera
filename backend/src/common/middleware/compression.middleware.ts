import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CompressionMetricsService } from '../services/compression-metrics.service';

@Injectable()
export class CompressionMetricsMiddleware implements NestMiddleware {
  constructor(private readonly compressionMetricsService: CompressionMetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    let bytesWritten = 0;

    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);

    res.write = ((chunk: any, encoding?: BufferEncoding, cb?: (error?: Error) => void) => {
      if (chunk) {
        bytesWritten += Buffer.isBuffer(chunk)
          ? chunk.length
          : Buffer.byteLength(chunk, encoding as BufferEncoding);
      }
      return originalWrite(chunk, encoding, cb);
    }) as typeof res.write;

    res.end = ((chunk?: any, encoding?: BufferEncoding, cb?: () => void) => {
      if (chunk) {
        bytesWritten += Buffer.isBuffer(chunk)
          ? chunk.length
          : Buffer.byteLength(chunk, encoding as BufferEncoding);
      }
      return originalEnd(chunk, encoding, cb);
    }) as typeof res.end;

    res.once('finish', () => {
      this.compressionMetricsService.recordResponse(res, bytesWritten);
    });

    next();
  }
}

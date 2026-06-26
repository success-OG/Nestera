import { CompressionMetricsService } from './compression-metrics.service';

describe('CompressionMetricsService', () => {
  let service: CompressionMetricsService;

  beforeEach(() => {
    service = new CompressionMetricsService();
  });

  it('records gzip responses correctly', () => {
    const response = {
      getHeader: jest.fn().mockReturnValue('gzip'),
    } as unknown as any;

    service.recordResponse(response, 4096);

    expect(service.getMetrics()).toEqual({
      totalResponses: 1,
      compressedResponses: 1,
      uncompressedResponses: 0,
      totalBytesSent: 4096,
      bytesSentWithCompression: 4096,
      averageResponseSizeBytes: 4096,
      compressedResponseRatio: 100,
    });
  });

  it('records uncompressed responses correctly', () => {
    const response = {
      getHeader: jest.fn().mockReturnValue(undefined),
    } as unknown as any;

    service.recordResponse(response, 2048);

    expect(service.getMetrics().uncompressedResponses).toBe(1);
  });
});

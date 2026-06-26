import {
  VersioningMiddleware,
  SUPPORTED_VERSIONS,
  CURRENT_VERSION,
  DEPRECATED_VERSIONS,
} from './versioning.middleware';

describe('VersioningMiddleware', () => {
  let middleware: VersioningMiddleware;
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    middleware = new VersioningMiddleware();
    mockReq = { headers: {}, url: '/api/v2/health' };
    mockRes = {
      setHeader: jest.fn(),
    };
    mockNext = jest.fn();
  });

  it('should set X-API-Version header for versioned URLs', () => {
    middleware.use(mockReq, mockRes, mockNext);
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-API-Version', '2');
    expect(mockNext).toHaveBeenCalled();
  });

  it('should set deprecation headers for deprecated versions', () => {
    mockReq.url = '/api/v1/health';
    middleware.use(mockReq, mockRes, mockNext);

    expect(mockRes.setHeader).toHaveBeenCalledWith('Deprecation', 'true');
    expect(mockRes.setHeader).toHaveBeenCalledWith(
      'Sunset',
      DEPRECATED_VERSIONS['1'].sunset,
    );
    expect(mockRes.setHeader).toHaveBeenCalledWith(
      'X-Deprecation-Notice',
      DEPRECATED_VERSIONS['1'].message,
    );
    expect(mockRes.setHeader).toHaveBeenCalledWith(
      'Link',
      `</api/v${CURRENT_VERSION}/docs>; rel="successor-version"`,
    );
  });

  it('should not set deprecation headers for current version', () => {
    mockReq.url = '/api/v2/users';
    middleware.use(mockReq, mockRes, mockNext);

    const calls = mockRes.setHeader.mock.calls.map((c: any) => c[0]);
    expect(calls).not.toContain('Deprecation');
    expect(calls).not.toContain('Sunset');
  });

  it('should rewrite URL when Accept-Version header is provided', () => {
    mockReq.url = '/api/health';
    mockReq.headers['accept-version'] = '1';
    middleware.use(mockReq, mockRes, mockNext);

    expect(mockReq.url).toBe('/api/v1/health');
  });

  it('should rewrite URL when X-API-Version header is provided', () => {
    mockReq.url = '/api/health';
    mockReq.headers['x-api-version'] = '2';
    middleware.use(mockReq, mockRes, mockNext);

    expect(mockReq.url).toBe('/api/v2/health');
  });

  it('should default to current version for unsupported header version', () => {
    mockReq.url = '/api/health';
    mockReq.headers['accept-version'] = '99';
    middleware.use(mockReq, mockRes, mockNext);

    expect(mockReq.url).toBe(`/api/v${CURRENT_VERSION}/health`);
  });

  it('should not rewrite URL if version is already in the path', () => {
    mockReq.url = '/api/v1/health';
    mockReq.headers['accept-version'] = '2';
    middleware.use(mockReq, mockRes, mockNext);

    expect(mockReq.url).toBe('/api/v1/health');
  });

  it('should export correct constants', () => {
    expect(SUPPORTED_VERSIONS).toContain('1');
    expect(SUPPORTED_VERSIONS).toContain('2');
    expect(CURRENT_VERSION).toBe('2');
    expect(DEPRECATED_VERSIONS['1']).toBeDefined();
    expect(DEPRECATED_VERSIONS['1'].sunset).toBeDefined();
  });
});

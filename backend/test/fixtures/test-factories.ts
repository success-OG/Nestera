import { v4 as uuidv4 } from 'uuid';

export interface TestUserCredentials {
  email: string;
  password: string;
  name?: string;
}

let counter = 0;

export function uniqueEmail(prefix = 'test'): string {
  counter++;
  return `${prefix}+${Date.now()}${counter}@e2e.test`;
}

export function buildRegisterPayload(overrides: Partial<TestUserCredentials> = {}): TestUserCredentials {
  return {
    email: uniqueEmail(),
    password: 'E2eTest@123!',
    name: 'E2E Test User',
    ...overrides,
  };
}

export function buildLoginPayload(email: string, password = 'E2eTest@123!') {
  return { email, password };
}

export function buildUpdateProfilePayload(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Updated Name',
    ...overrides,
  };
}

export function buildPaginationQuery(page = 1, limit = 10) {
  return { page, limit };
}

export function buildSavingsFilterQuery(overrides: Record<string, unknown> = {}) {
  return {
    page: 1,
    limit: 10,
    order: 'ASC',
    ...overrides,
  };
}

export function buildTransactionFilterQuery(overrides: Record<string, unknown> = {}) {
  return {
    page: 1,
    limit: 10,
    ...overrides,
  };
}

export const INVALID_PAYLOADS = {
  emptyBody: {},
  missingEmail: { password: 'E2eTest@123!', name: 'Test' },
  invalidEmail: { email: 'not-an-email', password: 'E2eTest@123!', name: 'Test' },
  weakPassword: { email: uniqueEmail(), password: 'weak', name: 'Test' },
  missingPassword: { email: uniqueEmail(), name: 'Test' },
  sqlInjection: { email: "' OR 1=1 --", password: 'anything', name: 'hack' },
  xssAttempt: {
    email: uniqueEmail(),
    password: 'E2eTest@123!',
    name: '<script>alert(1)</script>',
  },
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
} as const;

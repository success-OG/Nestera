import { RateLimiter } from "./utils";
import { captureApiError, addBreadcrumb } from "./monitoring";

const globalRateLimiter = new RateLimiter({
  maxConcurrent: 5,
  maxPerWindow: 20,
  windowMs: 1000,
});

export async function rateLimitedFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  return globalRateLimiter.execute(() => fetch(url, options));
}

export async function apiRequest<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const method = options?.method ?? "GET";

  addBreadcrumb({
    message: `${method} ${url}`,
    category: "api",
    data: { url, method },
    level: "info",
  });

  const response = await rateLimitedFetch(url, options);

  if (!response.ok) {
    const error = new Error(`API request failed: ${response.status} ${response.statusText}`);
    captureApiError(error, url, response.status, method);
    throw error;
  }

  return response.json() as Promise<T>;
}

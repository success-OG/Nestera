export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return function (this: any, ...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    if (now - lastCall < limit) return;
    lastCall = now;
    func.apply(this, args);
  };
}

export class RateLimiter {
  private queue: Array<() => void> = [];
  private active = 0;
  private maxConcurrent: number;
  private windowMs: number;
  private maxPerWindow: number;
  private windowStart: number = Date.now();
  private countInWindow: number = 0;

  constructor({
    maxConcurrent = 5,
    maxPerWindow = 10,
    windowMs = 1000,
  }: {
    maxConcurrent?: number;
    maxPerWindow?: number;
    windowMs?: number;
  } = {}) {
    this.maxConcurrent = maxConcurrent;
    this.maxPerWindow = maxPerWindow;
    this.windowMs = windowMs;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const executeFn = async () => {
        const now = Date.now();
        if (now - this.windowStart > this.windowMs) {
          this.windowStart = now;
          this.countInWindow = 0;
        }

        if (this.countInWindow >= this.maxPerWindow) {
          const waitTime = this.windowMs - (now - this.windowStart);
          setTimeout(() => {
            this.queue.push(executeFn);
            this.processQueue();
          }, waitTime);
          return;
        }

        if (this.active >= this.maxConcurrent) {
          this.queue.push(executeFn);
          return;
        }

        this.active++;
        this.countInWindow++;
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.active--;
          this.processQueue();
        }
      };
      executeFn();
    });
  }

  private processQueue() {
    if (this.queue.length > 0 && this.active < this.maxConcurrent) {
      const next = this.queue.shift();
      if (next) next();
    }
  }
}

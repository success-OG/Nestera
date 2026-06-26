import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  sampled: boolean;
  baggage: Record<string, string>;
}

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  tags: Record<string, string | number | boolean>;
  logs: Array<{
    timestamp: number;
    message: string;
    fields?: Record<string, unknown>;
  }>;
  status: 'active' | 'completed' | 'error';
  error?: string;
}

@Injectable()
export class DistributedTracingService {
  private readonly logger = new Logger(DistributedTracingService.name);
  private readonly activeSpans = new Map<string, Span>();
  private readonly completedSpans: Span[] = [];
  private readonly maxCompletedSpans = 10000;
  private readonly samplingRate: number;

  constructor() {
    this.samplingRate = parseFloat(process.env.APM_SAMPLING_RATE || '1.0');
  }

  parseTraceContext(
    headers: Record<string, string | string[] | undefined>,
  ): TraceContext | null {
    // W3C Trace Context format: traceparent header
    const traceparent = headers['traceparent'] as string;
    if (traceparent) {
      return this.parseTraceparent(traceparent, headers);
    }

    // DataDog format: x-datadog-trace-id, x-datadog-parent-id
    const ddTraceId = headers['x-datadog-trace-id'] as string;
    if (ddTraceId) {
      return {
        traceId: ddTraceId,
        spanId:
          (headers['x-datadog-parent-id'] as string) || this.generateSpanId(),
        sampled: (headers['x-datadog-sampling-priority'] as string) !== '0',
        baggage: {},
      };
    }

    return null;
  }

  private parseTraceparent(
    traceparent: string,
    headers: Record<string, string | string[] | undefined>,
  ): TraceContext | null {
    const parts = traceparent.split('-');
    if (parts.length !== 4) return null;

    const [, traceId, parentId, flags] = parts;
    const sampled = (parseInt(flags, 16) & 1) === 1;

    const baggage: Record<string, string> = {};
    const tracestateHeader = headers['tracestate'] as string;
    if (tracestateHeader) {
      tracestateHeader.split(',').forEach((entry) => {
        const [k, v] = entry.split('=');
        if (k && v) baggage[k.trim()] = v.trim();
      });
    }

    return { traceId, spanId: parentId, sampled, baggage };
  }

  createTraceContext(parentContext?: TraceContext): TraceContext {
    const sampled = Math.random() < this.samplingRate;
    return {
      traceId: parentContext?.traceId || this.generateTraceId(),
      spanId: this.generateSpanId(),
      parentSpanId: parentContext?.spanId,
      sampled: parentContext?.sampled ?? sampled,
      baggage: { ...(parentContext?.baggage || {}) },
    };
  }

  startSpan(
    operationName: string,
    context: TraceContext,
    tags: Record<string, string | number | boolean> = {},
  ): Span {
    const span: Span = {
      traceId: context.traceId,
      spanId: context.spanId,
      parentSpanId: context.parentSpanId,
      operationName,
      startTime: Date.now(),
      tags,
      logs: [],
      status: 'active',
    };

    if (context.sampled) {
      this.activeSpans.set(span.spanId, span);
    }

    return span;
  }

  finishSpan(span: Span, error?: Error): void {
    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;

    if (error) {
      span.status = 'error';
      span.error = error.message;
      span.tags['error'] = true;
      span.tags['error.message'] = error.message;
      span.tags['error.type'] = error.constructor.name;
      span.logs.push({
        timestamp: Date.now(),
        message: 'error',
        fields: { 'error.object': error.message, stack: error.stack },
      });
    } else {
      span.status = 'completed';
    }

    this.activeSpans.delete(span.spanId);
    this.completedSpans.push(span);

    if (this.completedSpans.length > this.maxCompletedSpans) {
      this.completedSpans.shift();
    }

    if (span.duration && span.duration > 1000) {
      this.logger.warn(
        `Slow span detected: ${span.operationName} took ${span.duration}ms`,
        {
          traceId: span.traceId,
          spanId: span.spanId,
          operationName: span.operationName,
        },
      );
    }
  }

  addSpanTag(span: Span, key: string, value: string | number | boolean): void {
    span.tags[key] = value;
  }

  addSpanLog(
    span: Span,
    message: string,
    fields?: Record<string, unknown>,
  ): void {
    span.logs.push({ timestamp: Date.now(), message, fields });
  }

  buildTraceparentHeader(context: TraceContext): string {
    const flags = context.sampled ? '01' : '00';
    return `00-${context.traceId}-${context.spanId}-${flags}`;
  }

  getActiveSpans(): Span[] {
    return Array.from(this.activeSpans.values());
  }

  getRecentSpans(limit = 100): Span[] {
    return this.completedSpans.slice(-limit);
  }

  getTraceById(traceId: string): Span[] {
    const active = Array.from(this.activeSpans.values()).filter(
      (s) => s.traceId === traceId,
    );
    const completed = this.completedSpans.filter((s) => s.traceId === traceId);
    return [...active, ...completed];
  }

  getTracingStats() {
    const completed = this.completedSpans;
    const errorSpans = completed.filter((s) => s.status === 'error');
    const durations = completed
      .map((s) => s.duration || 0)
      .filter((d) => d > 0);
    const sorted = [...durations].sort((a, b) => a - b);

    return {
      activeSpans: this.activeSpans.size,
      totalCompletedSpans: completed.length,
      errorRate:
        completed.length > 0 ? errorSpans.length / completed.length : 0,
      avgDurationMs:
        durations.length > 0
          ? durations.reduce((a, b) => a + b, 0) / durations.length
          : 0,
      p95DurationMs: sorted[Math.floor(sorted.length * 0.95)] || 0,
      p99DurationMs: sorted[Math.floor(sorted.length * 0.99)] || 0,
    };
  }

  private generateTraceId(): string {
    return uuidv4().replace(/-/g, '');
  }

  private generateSpanId(): string {
    return uuidv4().replace(/-/g, '').substring(0, 16);
  }
}

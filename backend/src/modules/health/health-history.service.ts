import { Injectable, Logger } from '@nestjs/common';

export interface HealthCheckResult {
  service: string;
  status: 'up' | 'down' | 'degraded';
  responseTime: number;
  timestamp: Date;
  error?: string;
}

@Injectable()
export class HealthHistoryService {
  private readonly logger = new Logger(HealthHistoryService.name);
  private history: HealthCheckResult[] = [];
  private readonly maxHistorySize = 1000;

  recordCheck(result: HealthCheckResult): void {
    this.history.push(result);

    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  getHistory(service?: string, limit: number = 100): HealthCheckResult[] {
    let filtered = this.history;

    if (service) {
      filtered = filtered.filter((h) => h.service === service);
    }

    return filtered.slice(-limit);
  }

  getServiceStats(service: string) {
    const serviceHistory = this.history.filter((h) => h.service === service);

    if (serviceHistory.length === 0) {
      return null;
    }

    const upCount = serviceHistory.filter((h) => h.status === 'up').length;
    const downCount = serviceHistory.filter((h) => h.status === 'down').length;
    const avgResponseTime =
      serviceHistory.reduce((sum, h) => sum + h.responseTime, 0) /
      serviceHistory.length;

    return {
      service,
      totalChecks: serviceHistory.length,
      uptime: ((upCount / serviceHistory.length) * 100).toFixed(2) + '%',
      downtime: ((downCount / serviceHistory.length) * 100).toFixed(2) + '%',
      avgResponseTime: `${avgResponseTime.toFixed(2)}ms`,
      lastCheck: serviceHistory[serviceHistory.length - 1],
    };
  }

  getAllStats() {
    const services = new Set(this.history.map((h) => h.service));
    const stats: any = {};

    services.forEach((service) => {
      stats[service] = this.getServiceStats(service);
    });

    return stats;
  }

  clearHistory(): void {
    this.history = [];
  }
}

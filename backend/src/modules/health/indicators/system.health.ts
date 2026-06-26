import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import * as os from 'os';

@Injectable()
export class SystemHealthIndicator extends HealthIndicator {
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const memoryUsage = process.memoryUsage();
    const freeMem = os.freemem();
    const totalMem = os.totalmem();
    const usedMem = totalMem - freeMem;
    const cpuLoad = os.loadavg();
    const uptime = process.uptime();

    const metrics = {
      processMemory: {
        rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB`,
      },
      systemMemory: {
        total: `${(totalMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
        free: `${(freeMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
        used: `${(usedMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
        utilizationPercentage: `${((usedMem / totalMem) * 100).toFixed(2)}%`,
      },
      cpu: {
        loadAverage1m: cpuLoad[0].toFixed(2),
        loadAverage5m: cpuLoad[1].toFixed(2),
        loadAverage15m: cpuLoad[2].toFixed(2),
        cores: os.cpus().length,
      },
      uptime: `${uptime.toFixed(0)}s`,
    };

    const isHealthy = (usedMem / totalMem) < 0.95;

    return this.getStatus(key, isHealthy, metrics);
  }
}

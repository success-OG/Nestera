import { Injectable } from '@nestjs/common';

/**
 * Utility service for common statistics operations
 */
@Injectable()
export class StatisticsUtilsService {
  /**
   * Calculate percentage change between two values
   */
  calculatePercentageChange(oldValue: number, newValue: number): number {
    if (oldValue === 0) {
      return newValue > 0 ? 100 : 0;
    }
    return ((newValue - oldValue) / oldValue) * 100;
  }

  /**
   * Calculate trend direction
   */
  getTrendDirection(
    oldValue: number,
    newValue: number,
  ): 'up' | 'down' | 'stable' {
    const threshold = 1; // 1% threshold
    const percentChange = this.calculatePercentageChange(oldValue, newValue);

    if (percentChange > threshold) return 'up';
    if (percentChange < -threshold) return 'down';
    return 'stable';
  }

  /**
   * Format large numbers for display
   */
  formatNumber(value: number, decimals: number = 2): string {
    if (value >= 1e9) {
      return (value / 1e9).toFixed(decimals) + 'B';
    }
    if (value >= 1e6) {
      return (value / 1e6).toFixed(decimals) + 'M';
    }
    if (value >= 1e3) {
      return (value / 1e3).toFixed(decimals) + 'K';
    }
    return value.toFixed(decimals);
  }

  /**
   * Calculate average of array
   */
  calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Calculate median of array
   */
  calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Calculate percentile
   */
  calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * sorted.length - 1;
    if (index < 0) return sorted[0];
    if (index >= sorted.length - 1) return sorted[sorted.length - 1];

    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  /**
   * Calculate standard deviation
   */
  calculateStdDev(values: number[]): number {
    if (values.length === 0) return 0;
    const avg = this.calculateAverage(values);
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) /
      values.length;
    return Math.sqrt(variance);
  }

  /**
   * Group array by key
   */
  groupByKey<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
    return items.reduce(
      (groups, item) => {
        const key = keyFn(item);
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(item);
        return groups;
      },
      {} as Record<string, T[]>,
    );
  }

  /**
   * Aggregate values by key
   */
  aggregateByKey<T>(
    items: T[],
    keyFn: (item: T) => string,
    valueFn: (item: T) => number,
  ): Record<string, number> {
    const grouped = this.groupByKey(items, keyFn);
    return Object.keys(grouped).reduce(
      (agg, key) => {
        agg[key] = grouped[key].reduce((sum, item) => sum + valueFn(item), 0);
        return agg;
      },
      {} as Record<string, number>,
    );
  }

  /**
   * Calculate growth rate
   */
  calculateGrowthRate(startValue: number, endValue: number): number {
    if (startValue === 0) {
      return endValue > 0 ? 100 : 0;
    }
    return ((endValue - startValue) / startValue) * 100;
  }

  /**
   * Calculate CAGR (Compound Annual Growth Rate)
   */
  calculateCAGR(
    startValue: number,
    endValue: number,
    yearsElapsed: number,
  ): number {
    if (startValue <= 0 || yearsElapsed === 0) return 0;
    return (Math.pow(endValue / startValue, 1 / yearsElapsed) - 1) * 100;
  }

  /**
   * Normalize values to 0-100 scale
   */
  normalizeToScale(
    value: number,
    min: number,
    max: number,
    scale: number = 100,
  ): number {
    if (max === min) return scale / 2;
    return ((value - min) / (max - min)) * scale;
  }

  /**
   * Convert date range string to Date objects
   */
  parseeDateRange(range: string): {
    start: Date;
    end: Date;
  } {
    const end = new Date();
    const start = new Date();

    switch (range.toLowerCase()) {
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
      case '90d':
        start.setDate(start.getDate() - 90);
        break;
      case '365d':
      case '1y':
        start.setFullYear(start.getFullYear() - 1);
        break;
      default:
        start.setDate(start.getDate() - 30);
    }

    return { start, end };
  }

  /**
   * Get business days between two dates
   */
  getBusinessDaysBetween(startDate: Date, endDate: Date): number {
    let count = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  /**
   * Format duration in human-readable format
   */
  formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Calculate SMA (Simple Moving Average)
   */
  calculateSMA(values: number[], period: number): number[] {
    const result: number[] = [];
    for (let i = 0; i <= values.length - period; i++) {
      const sum = values.slice(i, i + period).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
    return result;
  }

  /**
   * Calculate EMA (Exponential Moving Average)
   */
  calculateEMA(values: number[], period: number): number[] {
    const result: number[] = [];
    const multiplier = 2 / (period + 1);

    // SMA for first period
    let ema = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
    result.push(ema);

    // EMA for remaining values
    for (let i = period; i < values.length; i++) {
      ema = (values[i] - ema) * multiplier + ema;
      result.push(ema);
    }

    return result;
  }

  /**
   * Detect anomalies using z-score
   */
  detectAnomalies(
    values: number[],
    threshold: number = 3,
  ): { index: number; value: number; zscore: number }[] {
    const mean = this.calculateAverage(values);
    const stdDev = this.calculateStdDev(values);

    if (stdDev === 0) return [];

    return values
      .map((value, index) => ({
        index,
        value,
        zscore: Math.abs((value - mean) / stdDev),
      }))
      .filter((item) => item.zscore > threshold);
  }

  /**
   * Round to nearest value
   */
  roundToNearest(value: number, nearest: number): number {
    return Math.round(value / nearest) * nearest;
  }

  /**
   * Clamp value between min and max
   */
  clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Calculate percentage of total
   */
  calculatePercentage(value: number, total: number): number {
    if (total === 0) return 0;
    return (value / total) * 100;
  }

  /**
   * Format as currency
   */
  formatCurrency(
    value: number,
    currency: string = 'USD',
    decimals: number = 2,
  ): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }
}

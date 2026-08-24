import cron from 'node-cron';
import { AggregatesRepository } from '../db/aggregates.js';

// ==========================================
// Hourly & Daily Aggregation Cron Jobs
// ==========================================

export class AggregationJob {
  private static hourlyTask: cron.ScheduledTask | null = null;
  private static dailyTask: cron.ScheduledTask | null = null;

  static start(): void {
    console.log('[Jobs] Starting aggregation cron schedules');

    // Run catchup on server startup for the previous hour
    this.runHourlyAggregation();

    // Schedule hourly aggregation at minute 0 of every hour (0 * * * *)
    this.hourlyTask = cron.schedule('0 * * * *', () => {
      console.log('[Jobs] Running scheduled hourly aggregation...');
      this.runHourlyAggregation();
    });

    // Schedule daily aggregation at midnight 00:05 (5 0 * * *)
    this.dailyTask = cron.schedule('5 0 * * *', () => {
      console.log('[Jobs] Running scheduled daily aggregation...');
      this.runDailyAggregation();
    });
  }

  static stop(): void {
    if (this.hourlyTask) this.hourlyTask.stop();
    if (this.dailyTask) this.dailyTask.stop();
    console.log('[Jobs] Stopped aggregation cron schedules');
  }

  /**
   * Aggregate previous completed hour
   */
  static runHourlyAggregation(targetTimestamp?: number): void {
    try {
      const now = targetTimestamp || Date.now();
      // Round down to current hour, then subtract 1 hour to aggregate the completed hour
      const currentHourStart = Math.floor(now / (3600 * 1000)) * (3600 * 1000);
      const prevHourStart = currentHourStart - 3600 * 1000;

      const affected = AggregatesRepository.aggregateHourly(prevHourStart);
      const hourLabel = new Date(prevHourStart).toISOString();
      console.log(`[Jobs] Hourly aggregation complete for ${hourLabel}. Rows generated/updated: ${affected}`);
    } catch (err: any) {
      console.error(`[Jobs] Hourly aggregation error:`, err.message);
    }
  }

  /**
   * Aggregate previous completed day
   */
  static runDailyAggregation(targetTimestamp?: number): void {
    try {
      const now = targetTimestamp || Date.now();
      // Round down to current day start (00:00:00 UTC/Local)
      const currentDayStart = Math.floor(now / (86400 * 1000)) * (86400 * 1000);
      const prevDayStart = currentDayStart - 86400 * 1000;

      const affected = AggregatesRepository.aggregateDaily(prevDayStart);
      const dayLabel = new Date(prevDayStart).toISOString();
      console.log(`[Jobs] Daily aggregation complete for ${dayLabel}. Rows generated/updated: ${affected}`);
    } catch (err: any) {
      console.error(`[Jobs] Daily aggregation error:`, err.message);
    }
  }
}

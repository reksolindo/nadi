import cron from 'node-cron';
import { RawSamplesRepository } from '../db/raw-samples.js';
import { AggregatesRepository } from '../db/aggregates.js';

// ==========================================
// Retention Policy Purge Cron Job
// ==========================================

export class PurgeJob {
  private static task: cron.ScheduledTask | null = null;

  // 48 hours in milliseconds
  static readonly RAW_RETENTION_MS = 48 * 3600 * 1000;
  // 90 days in milliseconds
  static readonly HOURLY_RETENTION_MS = 90 * 24 * 3600 * 1000;

  static start(): void {
    console.log('[Jobs] Starting purge retention cron schedule');

    // Run initial cleanup on startup
    this.runPurge();

    // Schedule cleanup at minute 30 of every hour (30 * * * *)
    this.task = cron.schedule('30 * * * *', () => {
      console.log('[Jobs] Running scheduled retention purge...');
      this.runPurge();
    });
  }

  static stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
    }
    console.log('[Jobs] Stopped purge cron schedule');
  }

  /**
   * Execute purge logic
   */
  static runPurge(): void {
    try {
      // 1. Purge raw_samples older than 48 hours
      const rawPurged = RawSamplesRepository.purgeOlderThan(this.RAW_RETENTION_MS);
      if (rawPurged > 0) {
        console.log(`[Jobs] Purged ${rawPurged} expired raw samples (> 48 hours old)`);
      }

      // 2. Purge hourly_aggregates older than 90 days
      const hourlyPurged = AggregatesRepository.purgeHourlyOlderThan(this.HOURLY_RETENTION_MS);
      if (hourlyPurged > 0) {
        console.log(`[Jobs] Purged ${hourlyPurged} expired hourly aggregates (> 90 days old)`);
      }

      // Note: Daily aggregates are never purged (permanent retention)
    } catch (err: any) {
      console.error(`[Jobs] Purge error:`, err.message);
    }
  }
}

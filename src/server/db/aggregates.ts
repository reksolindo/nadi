import { getDatabase } from './connection.js';
import { HistoricalDataPoint, AggregateDataPoint } from '../types.js';
import { config } from '../config.js';

// ==========================================
// Aggregates Database Access & Processing
// ==========================================

export class AggregatesRepository {
  /**
   * Aggregate raw_samples for a specific hour into hourly_aggregates
   */
  static aggregateHourly(hourStartTs: number): number {
    const db = getDatabase();
    const hourEndTs = hourStartTs + 3600 * 1000;

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO hourly_aggregates (
        username,
        hour_start,
        avg_tx_rate,
        avg_rx_rate,
        avg_tx_rate_bps,
        avg_rx_rate_bps,
        max_tx_rate,
        max_rx_rate,
        total_tx_bytes,
        total_rx_bytes,
        sample_count
      )
      SELECT
        username,
        ? as hour_start,
        AVG(tx_rate) as avg_tx_rate,
        AVG(rx_rate) as avg_rx_rate,
        AVG(tx_rate_bps) as avg_tx_rate_bps,
        AVG(rx_rate_bps) as avg_rx_rate_bps,
        MAX(tx_rate) as max_tx_rate,
        MAX(rx_rate) as max_rx_rate,
        MAX(tx_bytes) - MIN(tx_bytes) as total_tx_bytes,
        MAX(rx_bytes) - MIN(rx_bytes) as total_rx_bytes,
        COUNT(*) as sample_count
      FROM raw_samples
      WHERE sampled_at >= ? AND sampled_at < ?
      GROUP BY username
    `);

    const result = stmt.run(hourStartTs, hourStartTs, hourEndTs);
    return result.changes;
  }

  /**
   * Aggregate hourly_aggregates for a specific day into daily_aggregates
   */
  static aggregateDaily(dayStartTs: number): number {
    const db = getDatabase();
    const dayEndTs = dayStartTs + 86400 * 1000;

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO daily_aggregates (
        username,
        day_start,
        avg_tx_rate,
        avg_rx_rate,
        avg_tx_rate_bps,
        avg_rx_rate_bps,
        max_tx_rate,
        max_rx_rate,
        total_tx_bytes,
        total_rx_bytes,
        sample_count
      )
      SELECT
        username,
        ? as day_start,
        AVG(avg_tx_rate) as avg_tx_rate,
        AVG(avg_rx_rate) as avg_rx_rate,
        AVG(avg_tx_rate_bps) as avg_tx_rate_bps,
        AVG(avg_rx_rate_bps) as avg_rx_rate_bps,
        MAX(max_tx_rate) as max_tx_rate,
        MAX(max_rx_rate) as max_rx_rate,
        SUM(total_tx_bytes) as total_tx_bytes,
        SUM(total_rx_bytes) as total_rx_bytes,
        SUM(sample_count) as sample_count
      FROM hourly_aggregates
      WHERE hour_start >= ? AND hour_start < ?
      GROUP BY username
    `);

    const result = stmt.run(dayStartTs, dayStartTs, dayEndTs);
    return result.changes;
  }

  /**
   * Get user historical data from hourly_aggregates
   */
  static getUserHourlyHistory(username: string, fromTs: number, toTs: number): HistoricalDataPoint[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT
        hour_start as timestamp,
        avg_tx_rate as txRate,
        avg_rx_rate as rxRate,
        avg_tx_rate_bps as txRateBps,
        avg_rx_rate_bps as rxRateBps,
        total_tx_bytes as totalTxBytes,
        total_rx_bytes as totalRxBytes
      FROM hourly_aggregates
      WHERE username = ? AND hour_start >= ? AND hour_start <= ?
      ORDER BY hour_start ASC
    `);

    return stmt.all(username, fromTs, toTs) as HistoricalDataPoint[];
  }

  /**
   * Get total network aggregate from hourly_aggregates
   */
  static getAggregateHourlyHistory(fromTs: number, toTs: number): AggregateDataPoint[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT
        hour_start as timestamp,
        SUM(avg_tx_rate) as totalTxRate,
        SUM(avg_rx_rate) as totalRxRate,
        SUM(avg_tx_rate_bps) as totalTxRateBps,
        SUM(avg_rx_rate_bps) as totalRxRateBps,
        COUNT(DISTINCT username) as activeUsersCount
      FROM hourly_aggregates
      WHERE hour_start >= ? AND hour_start <= ?
      GROUP BY hour_start
      ORDER BY hour_start ASC
    `);

    const rows = stmt.all(fromTs, toTs) as any[];
    const capacityBps = config.CAPACITY_MBPS * 1_000_000;

    return rows.map((r) => {
      const totalRxRateBps = r.totalRxRateBps || (r.totalRxRate * 8);
      const totalTxRateBps = r.totalTxRateBps || (r.totalTxRate * 8);
      const totalBandwidthBps = totalRxRateBps + totalTxRateBps;
      const utilizationPercent = capacityBps > 0 ? Math.min(100, (totalBandwidthBps / capacityBps) * 100) : 0;

      return {
        timestamp: r.timestamp,
        totalTxRate: r.totalTxRate || 0,
        totalRxRate: r.totalRxRate || 0,
        totalTxRateBps,
        totalRxRateBps,
        capacityMbps: config.CAPACITY_MBPS,
        utilizationPercent: Number(utilizationPercent.toFixed(1)),
        activeUsersCount: r.activeUsersCount || 0,
      };
    });
  }

  /**
   * Delete hourly aggregates older than maxAgeMs (default 90 days)
   */
  static purgeHourlyOlderThan(maxAgeMs: number): number {
    const db = getDatabase();
    const cutoff = Date.now() - maxAgeMs;
    const stmt = db.prepare('DELETE FROM hourly_aggregates WHERE hour_start < ?');
    const info = stmt.run(cutoff);
    return info.changes;
  }

  /**
   * Get row counts for aggregates
   */
  static getCounts(): { hourlyCount: number; dailyCount: number } {
    const db = getDatabase();
    const h = db.prepare('SELECT COUNT(*) as count FROM hourly_aggregates').get() as { count: number };
    const d = db.prepare('SELECT COUNT(*) as count FROM daily_aggregates').get() as { count: number };
    return {
      hourlyCount: h.count,
      dailyCount: d.count,
    };
  }
}

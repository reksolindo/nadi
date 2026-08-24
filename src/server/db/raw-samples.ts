import { getDatabase } from './connection.js';
import { UserBandwidthSample, HistoricalDataPoint, AggregateDataPoint } from '../types.js';
import { config } from '../config.js';

// ==========================================
// Raw Samples Database Access
// ==========================================

export class RawSamplesRepository {
  /**
   * Batch insert raw samples within a single high-performance transaction
   */
  static insertBatch(samples: UserBandwidthSample[]): void {
    if (samples.length === 0) return;

    const db = getDatabase();
    const insertStmt = db.prepare(`
      INSERT INTO raw_samples (
        username, mac_address, ip_address,
        tx_rate, rx_rate, tx_rate_bps, rx_rate_bps,
        tx_bytes, rx_bytes, sampled_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((items: UserBandwidthSample[]) => {
      for (const item of items) {
        insertStmt.run(
          item.username,
          item.macAddress,
          item.ipAddress,
          item.txRate,
          item.rxRate,
          item.txRateBps,
          item.rxRateBps,
          item.txBytes,
          item.rxBytes,
          item.timestamp
        );
      }
    });

    insertMany(samples);
  }

  /**
   * Get raw historical points for a single user within a timestamp range
   */
  static getUserHistory(username: string, fromTs: number, toTs: number): HistoricalDataPoint[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT
        sampled_at as timestamp,
        tx_rate as txRate,
        rx_rate as rxRate,
        tx_rate_bps as txRateBps,
        rx_rate_bps as rxRateBps,
        tx_bytes as totalTxBytes,
        rx_bytes as totalRxBytes
      FROM raw_samples
      WHERE username = ? AND sampled_at >= ? AND sampled_at <= ?
      ORDER BY sampled_at ASC
    `);

    return stmt.all(username, fromTs, toTs) as HistoricalDataPoint[];
  }

  /**
   * Get total bandwidth aggregate from raw samples grouped into time buckets
   */
  static getAggregateHistory(fromTs: number, toTs: number, bucketSeconds = 10): AggregateDataPoint[] {
    const db = getDatabase();
    const bucketMs = bucketSeconds * 1000;

    // Group samples by time bucket
    const stmt = db.prepare(`
      SELECT
        (sampled_at / ${bucketMs}) * ${bucketMs} as timestamp,
        SUM(tx_rate) as totalTxRate,
        SUM(rx_rate) as totalRxRate,
        SUM(tx_rate_bps) as totalTxRateBps,
        SUM(rx_rate_bps) as totalRxRateBps,
        COUNT(DISTINCT username) as activeUsersCount
      FROM raw_samples
      WHERE sampled_at >= ? AND sampled_at <= ?
      GROUP BY (sampled_at / ${bucketMs})
      ORDER BY timestamp ASC
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
   * Delete samples older than maxAgeMs
   */
  static purgeOlderThan(maxAgeMs: number): number {
    const db = getDatabase();
    const cutoff = Date.now() - maxAgeMs;
    const stmt = db.prepare('DELETE FROM raw_samples WHERE sampled_at < ?');
    const info = stmt.run(cutoff);
    return info.changes;
  }

  /**
   * Get total row count
   */
  static getCount(): number {
    const db = getDatabase();
    const row = db.prepare('SELECT COUNT(*) as count FROM raw_samples').get() as { count: number };
    return row.count;
  }
}

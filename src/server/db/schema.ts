import { getDatabase } from './connection.js';

// ==========================================
// Database Schema Initialization
// ==========================================

export function initSchema(): void {
  const db = getDatabase();

  db.exec(`
    -- Tier 1: Raw Bandwidth Samples (Retention: 48 hours)
    CREATE TABLE IF NOT EXISTS raw_samples (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      mac_address TEXT NOT NULL,
      ip_address TEXT NOT NULL,
      tx_rate INTEGER NOT NULL,
      rx_rate INTEGER NOT NULL,
      tx_rate_bps INTEGER NOT NULL DEFAULT 0,
      rx_rate_bps INTEGER NOT NULL DEFAULT 0,
      tx_bytes INTEGER NOT NULL,
      rx_bytes INTEGER NOT NULL,
      sampled_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_raw_samples_user_time
      ON raw_samples (username, sampled_at);

    CREATE INDEX IF NOT EXISTS idx_raw_samples_time
      ON raw_samples (sampled_at);

    -- Tier 2: Hourly Aggregates (Retention: 90 days)
    CREATE TABLE IF NOT EXISTS hourly_aggregates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      hour_start INTEGER NOT NULL,
      avg_tx_rate REAL NOT NULL,
      avg_rx_rate REAL NOT NULL,
      avg_tx_rate_bps REAL NOT NULL DEFAULT 0,
      avg_rx_rate_bps REAL NOT NULL DEFAULT 0,
      max_tx_rate INTEGER NOT NULL,
      max_rx_rate INTEGER NOT NULL,
      total_tx_bytes INTEGER NOT NULL,
      total_rx_bytes INTEGER NOT NULL,
      sample_count INTEGER NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_hourly_agg_user_hour
      ON hourly_aggregates (username, hour_start);

    CREATE INDEX IF NOT EXISTS idx_hourly_agg_time
      ON hourly_aggregates (hour_start);

    -- Tier 3: Daily Aggregates (Retention: Permanent)
    CREATE TABLE IF NOT EXISTS daily_aggregates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      day_start INTEGER NOT NULL,
      avg_tx_rate REAL NOT NULL,
      avg_rx_rate REAL NOT NULL,
      avg_tx_rate_bps REAL NOT NULL DEFAULT 0,
      avg_rx_rate_bps REAL NOT NULL DEFAULT 0,
      max_tx_rate INTEGER NOT NULL,
      max_rx_rate INTEGER NOT NULL,
      total_tx_bytes INTEGER NOT NULL,
      total_rx_bytes INTEGER NOT NULL,
      sample_count INTEGER NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_agg_user_day
      ON daily_aggregates (username, day_start);

    CREATE INDEX IF NOT EXISTS idx_daily_agg_time
      ON daily_aggregates (day_start);

    -- Dynamic App Settings & Runtime Configuration
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  console.log('[DB] Schema verified & initialized successfully');
}

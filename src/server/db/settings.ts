import { getDatabase } from './connection.js';
import { config } from '../config.js';

export function getSetting(key: string, defaultValue?: string): string | undefined {
  const db = getDatabase();
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row ? row.value : defaultValue;
}

export function getIntSetting(key: string, defaultValue: number): number {
  const val = getSetting(key);
  if (!val) return defaultValue;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

export function setSetting(key: string, value: string): void {
  const db = getDatabase();
  const now = Date.now();
  db.prepare(`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `).run(key, value, now);
}

export function getAllSettings(): Record<string, string> {
  const db = getDatabase();
  const rows = db.prepare('SELECT key, value FROM app_settings').all() as { key: string; value: string }[];
  const result: Record<string, string> = {};
  for (const r of rows) {
    result[r.key] = r.value;
  }
  return result;
}

/**
 * Get current configured ISP capacity in Mbps
 */
export function getIspCapacityMbps(): number {
  return getIntSetting('isp_capacity_mbps', config.CAPACITY_MBPS);
}

/**
 * Update configured ISP capacity in Mbps
 */
export function setIspCapacityMbps(mbps: number): void {
  const validMbps = Math.max(1, Math.min(100000, Math.round(mbps)));
  setSetting('isp_capacity_mbps', validMbps.toString());
}

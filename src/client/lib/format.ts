// ==========================================
// Formatting Utilities
// ==========================================

/**
 * Format bits per second (bps) into human-readable network speed (Mbps, Kbps, Gbps)
 */
export function formatSpeed(bps: number | undefined | null): { value: string; unit: string; full: string } {
  if (!bps || isNaN(bps) || bps <= 0) {
    return { value: '0.0', unit: 'bps', full: '0.0 bps' };
  }

  if (bps >= 1_000_000_000) {
    const v = (bps / 1_000_000_000).toFixed(2);
    return { value: v, unit: 'Gbps', full: `${v} Gbps` };
  }

  if (bps >= 1_000_000) {
    const v = (bps / 1_000_000).toFixed(1);
    return { value: v, unit: 'Mbps', full: `${v} Mbps` };
  }

  if (bps >= 1_000) {
    const v = (bps / 1_000).toFixed(0);
    return { value: v, unit: 'Kbps', full: `${v} Kbps` };
  }

  return { value: bps.toFixed(0), unit: 'bps', full: `${bps.toFixed(0)} bps` };
}

/**
 * Format bytes per second (B/s) into human-readable speed
 */
export function formatSpeedFromBytes(bytesPerSec: number | undefined | null): { value: string; unit: string; full: string } {
  const bps = (bytesPerSec || 0) * 8;
  return formatSpeed(bps);
}

/**
 * Format cumulative bytes into KB, MB, GB, TB
 */
export function formatBytes(bytes: number | undefined | null): { value: string; unit: string; full: string } {
  if (!bytes || isNaN(bytes) || bytes <= 0) {
    return { value: '0', unit: 'B', full: '0 B' };
  }

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const clampedI = Math.min(i, sizes.length - 1);

  const v = (bytes / Math.pow(k, clampedI)).toFixed(clampedI >= 3 ? 2 : 1);
  const unit = sizes[clampedI];

  return { value: v, unit, full: `${v} ${unit}` };
}

/**
 * Format timestamp into short time string (e.g. 14:25:30)
 */
export function formatTimeOnly(timestamp: number): string {
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(timestamp));
}

/**
 * Format timestamp into date & time (e.g. 21 Agu 16:30)
 */
export function formatDateTime(timestamp: number): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(timestamp));
}

/**
 * Clean up Mikrotik uptime string (e.g. 1w2d3h4m5s -> 1w 2d 3h)
 */
export function cleanUptime(uptime?: string): string {
  if (!uptime) return '-';
  return uptime.replace(/([a-z])/g, '$1 ').trim();
}

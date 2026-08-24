import dotenv from 'dotenv';
import path from 'node:path';

// Load .env file from project root
dotenv.config();

export interface AppConfig {
  NODE_ENV: string;
  HOST: string;
  PORT: number;
  
  // Mikrotik API Settings
  MIKROTIK_HOST: string;
  MIKROTIK_PORT: number;
  MIKROTIK_USER: string;
  MIKROTIK_PASSWORD?: string;
  MIKROTIK_TLS: boolean;
  MIKROTIK_TIMEOUT_MS: number;
  
  // Poller Settings
  POLL_INTERVAL_MS: number;
  
  // Database Settings
  DB_PATH: string;
  
  // Network / ISP Capacity
  CAPACITY_MBPS: number;
  
  // Development / Simulation Mode
  MOCK_MODE: boolean;
}

function parseBool(val: string | undefined, defaultVal = false): boolean {
  if (!val) return defaultVal;
  return val.toLowerCase() === 'true' || val === '1' || val.toLowerCase() === 'yes';
}

function parseIntSafe(val: string | undefined, defaultVal: number): number {
  if (!val) return defaultVal;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? defaultVal : parsed;
}

export const config: AppConfig = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  HOST: process.env.HOST || '0.0.0.0',
  PORT: parseIntSafe(process.env.PORT, 3100),
  
  MIKROTIK_HOST: process.env.MIKROTIK_HOST || '192.168.1.1',
  MIKROTIK_PORT: parseIntSafe(process.env.MIKROTIK_PORT, 8728),
  MIKROTIK_USER: process.env.MIKROTIK_USER || 'admin',
  MIKROTIK_PASSWORD: process.env.MIKROTIK_PASSWORD || '',
  MIKROTIK_TLS: parseBool(process.env.MIKROTIK_TLS, false),
  MIKROTIK_TIMEOUT_MS: parseIntSafe(process.env.MIKROTIK_TIMEOUT_MS, 5000),
  
  POLL_INTERVAL_MS: parseIntSafe(process.env.POLL_INTERVAL_MS, 5000),
  
  DB_PATH: process.env.DB_PATH || path.resolve(process.cwd(), 'data/nadi.db'),
  CAPACITY_MBPS: parseIntSafe(process.env.CAPACITY_MBPS, 200),
  
  MOCK_MODE: parseBool(process.env.MOCK_MODE, false),
};

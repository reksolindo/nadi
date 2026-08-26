import { FastifyPluginAsync } from 'fastify';
import { MikrotikPoller } from '../mikrotik/poller.js';
import { RawSamplesRepository } from '../db/raw-samples.js';
import { AggregatesRepository } from '../db/aggregates.js';
import { getIspCapacityMbps } from '../db/settings.js';
import { config } from '../config.js';
import fs from 'node:fs';
import path from 'node:path';

// ==========================================
// System Status & Diagnostic Routes
// ==========================================

export const statusRoutes = (poller: MikrotikPoller): FastifyPluginAsync => {
  return async (fastify) => {
    fastify.get('/api/status', async (_request, reply) => {
      let dbSizeBytes = 0;
      try {
        const dbPath = path.resolve(process.cwd(), config.DB_PATH);
        if (fs.existsSync(dbPath)) {
          const stats = fs.statSync(dbPath);
          dbSizeBytes = stats.size;
        }
      } catch (err) {
        // Ignore stat error
      }

      const rawCount = RawSamplesRepository.getCount();
      const { hourlyCount, dailyCount } = AggregatesRepository.getCounts();
      const mem = process.memoryUsage();

      return reply.send({
        success: true,
        app: {
          name: 'NADI',
          fullName: 'Network Activity & Data Insight',
          version: '1.0.0',
          uptimeSeconds: Math.floor(process.uptime()),
          memoryMb: Math.round((mem.heapUsed / (1024 * 1024)) * 10) / 10,
        },
        router: {
          host: config.MIKROTIK_HOST,
          port: config.MIKROTIK_PORT,
          connected: poller.status.connected,
          mockMode: config.MOCK_MODE,
          lastPolledAt: poller.status.lastPolledAt,
          lastError: poller.status.lastError,
          pollIntervalMs: config.POLL_INTERVAL_MS,
          activeUsersCount: poller.status.activeUsersCount,
        },
        database: {
          rawSamplesCount: rawCount,
          hourlyAggregatesCount: hourlyCount,
          dailyAggregatesCount: dailyCount,
          sizeBytes: dbSizeBytes,
        },
        network: {
          capacityMbps: getIspCapacityMbps(),
        },
      });
    });
  };
};

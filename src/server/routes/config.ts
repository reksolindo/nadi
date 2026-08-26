import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getIspCapacityMbps, setIspCapacityMbps, getAllSettings, setSetting } from '../db/settings.js';
import { config } from '../config.js';
import type { MikrotikPoller } from '../mikrotik/poller.js';

export const configRoutes: FastifyPluginAsync<{ poller: MikrotikPoller }> = async (
  fastify: FastifyInstance,
  opts
) => {
  const { poller } = opts;

  // GET /api/config - Get current configuration and dynamic settings
  fastify.get('/api/config', async (_req, reply) => {
    try {
      const capacityMbps = getIspCapacityMbps();
      const allSettings = getAllSettings();

      return reply.send({
        success: true,
        capacityMbps,
        settings: allSettings,
        envDefaults: {
          capacityMbps: config.CAPACITY_MBPS,
          pollIntervalMs: config.POLL_INTERVAL_MS,
          mockMode: config.MOCK_MODE,
        },
      });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: err.message || 'Failed to retrieve configuration',
      });
    }
  });

  // PATCH /api/config - Update dynamic settings (e.g. ISP capacity)
  fastify.patch<{
    Body: {
      capacityMbps?: number;
      routerLabel?: string;
      customSettings?: Record<string, string>;
    };
  }>('/api/config', async (req, reply) => {
    try {
      const { capacityMbps, routerLabel, customSettings } = req.body || {};

      if (typeof capacityMbps === 'number' && !isNaN(capacityMbps)) {
        if (capacityMbps <= 0 || capacityMbps > 100000) {
          return reply.status(400).send({
            success: false,
            error: 'ISP capacity must be between 1 and 100,000 Mbps',
          });
        }
        setIspCapacityMbps(capacityMbps);
        console.log(`[Config] ISP Capacity updated to ${capacityMbps} Mbps`);
      }

      if (typeof routerLabel === 'string' && routerLabel.trim()) {
        setSetting('router_label', routerLabel.trim());
      }

      if (customSettings && typeof customSettings === 'object') {
        for (const [k, v] of Object.entries(customSettings)) {
          if (typeof v === 'string') {
            setSetting(k, v);
          }
        }
      }

      // Trigger immediate poller refresh to update WebSocket broadcast clients
      if (poller) {
        poller.refreshSummary();
      }

      const updatedCapacity = getIspCapacityMbps();
      const updatedSettings = getAllSettings();

      return reply.send({
        success: true,
        capacityMbps: updatedCapacity,
        settings: updatedSettings,
        message: 'Configuration updated successfully',
      });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: err.message || 'Failed to update configuration',
      });
    }
  });
};

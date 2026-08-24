import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { SpeedTestService } from '../mikrotik/speedtest.js';
import { poller } from '../index.js';

export const speedTestRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * POST /api/speedtest/run
   * Trigger an on-demand ISP speed test benchmark
   */
  fastify.post('/api/speedtest/run', async (_req, reply) => {
    try {
      const result = await SpeedTestService.runTest();
      return reply.send({
        success: true,
        result,
      });
    } catch (err: any) {
      fastify.log.error(err, 'Failed to run speed test');
      return reply.status(500).send({
        success: false,
        error: err.message || 'Speed test failed',
      });
    }
  });

  /**
   * GET /api/speedtest/history
   * Get previous speed test results
   */
  fastify.get('/api/speedtest/history', async (_req, reply) => {
    const history = SpeedTestService.getHistory();
    return reply.send({
      success: true,
      history,
      latest: SpeedTestService.getLatest(),
    });
  });

  /**
   * GET /api/speedtest/wan-live
   * Get instant WAN interface (ether11) physical traffic from Mikrotik
   */
  fastify.get('/api/speedtest/wan-live', async (_req, reply) => {
    try {
      const client = poller.getClient();
      const wan = await client.getWanTraffic('ether11');
      return reply.send({
        success: true,
        wan,
      });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: err.message,
      });
    }
  });
};

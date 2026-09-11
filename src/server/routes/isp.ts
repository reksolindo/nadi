import { FastifyPluginAsync } from 'fastify';
import { IspHealthService } from '../mikrotik/ispHealth.js';

export const ispRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/isp/health - Get multi-hop latency, packet loss, and dispute diagnosis
  fastify.get('/api/isp/health', async (_request, reply) => {
    try {
      const health = await IspHealthService.check(false);
      return reply.send({
        success: true,
        health,
      });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: err.message,
      });
    }
  });

  // POST /api/isp/health/refresh - Force immediate diagnostic re-run
  fastify.post('/api/isp/health/refresh', async (_request, reply) => {
    try {
      const health = await IspHealthService.check(true);
      return reply.send({
        success: true,
        health,
      });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: err.message,
      });
    }
  });
};

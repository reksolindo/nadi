import { FastifyPluginAsync } from 'fastify';
import { MikrotikPoller } from '../mikrotik/poller.js';

// ==========================================
// Active Users Routes
// ==========================================

export const usersRoutes = (poller: MikrotikPoller): FastifyPluginAsync => {
  return async (fastify) => {
    fastify.get('/api/users/active', async (_request, reply) => {
      const users = poller.activeUsers;
      const summary = poller.networkSummary;

      return reply.send({
        success: true,
        count: users.length,
        users,
        summary,
      });
    });

    fastify.get<{
      Params: { ip: string };
      Querystring: { username?: string };
    }>('/api/users/:ip/traffic-breakdown', async (request, reply) => {
      const { ip } = request.params;
      const { username } = request.query;

      if (!ip) {
        return reply.status(400).send({ error: 'IP address is required' });
      }

      const breakdown = await poller.inspectUserTraffic(ip, username);

      return reply.send({
        success: true,
        ...breakdown,
      });
    });
  };
};

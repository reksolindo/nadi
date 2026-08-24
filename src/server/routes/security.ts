import { FastifyPluginAsync } from 'fastify';
import { MikrotikPoller } from '../mikrotik/poller.js';

// ==========================================
// Security & Network Access Attempts Routes
// ==========================================

export const securityRoutes = (poller: MikrotikPoller): FastifyPluginAsync => {
  return async (fastify) => {
    // Get full security audit summary
    fastify.get('/api/security/summary', async (_request, reply) => {
      const summary = await poller.getSecurityAudit();
      return reply.send({
        success: true,
        summary,
      });
    });

    // Get unauthenticated & captive portal hosts
    fastify.get('/api/security/hosts', async (_request, reply) => {
      const audit = await poller.getSecurityAudit();
      return reply.send({
        success: true,
        unauthorizedHostsCount: audit.unauthorizedHostsCount,
        totalHostsCount: audit.totalHostsCount,
        hosts: audit.unauthorizedHosts,
      });
    });

    // Get security and failed login logs
    fastify.get('/api/security/logs', async (_request, reply) => {
      const audit = await poller.getSecurityAudit();
      return reply.send({
        success: true,
        failedCount: audit.recentFailedLoginsCount,
        logs: audit.recentLogs,
      });
    });
  };
};

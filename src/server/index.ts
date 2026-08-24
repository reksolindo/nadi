import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import fs from 'node:fs';

import { config } from './config.js';
import { initSchema } from './db/schema.js';
import { closeDatabase } from './db/connection.js';
import { MikrotikPoller } from './mikrotik/poller.js';
import { WebSocketHandler } from './ws/handler.js';
import { AggregationJob } from './jobs/aggregation.js';
import { PurgeJob } from './jobs/purge.js';

import { usersRoutes } from './routes/users.js';
import { historyRoutes } from './routes/history.js';
import { aggregateRoutes } from './routes/aggregate.js';
import { statusRoutes } from './routes/status.js';
import { securityRoutes } from './routes/security.js';
import { speedTestRoutes } from './routes/speedtest.js';

// ==========================================
// Fastify Server Bootstrap
// ==========================================

export let poller: MikrotikPoller;

async function startServer() {
  console.log('====================================================');
  console.log('  NADI — Network Activity & Data Insight');
  console.log('====================================================');

  // 1. Initialize SQLite Database
  initSchema();

  // 2. Initialize Fastify
  const fastify = Fastify({
    logger: false,
  });

  // 3. Register CORS (useful during frontend dev server proxying)
  await fastify.register(cors, {
    origin: true,
  });

  // 4. Register WebSocket plugin
  await fastify.register(websocket);

  // 5. Initialize Poller & Background Jobs
  poller = new MikrotikPoller();

  // 6. Register WebSocket endpoint at /ws
  fastify.register(async (wsFastify) => {
    wsFastify.get('/ws', { websocket: true }, (socket, _req) => {
      WebSocketHandler.registerClient(socket);
    });
  });

  // 7. Register REST API routes
  await fastify.register(usersRoutes(poller));
  await fastify.register(historyRoutes);
  await fastify.register(aggregateRoutes);
  await fastify.register(statusRoutes(poller));
  await fastify.register(securityRoutes(poller));
  await fastify.register(speedTestRoutes);

  // 8. Serve static Frontend build if present (production / Docker mode)
  const clientDistPath = path.resolve(process.cwd(), 'dist/client');
  if (fs.existsSync(clientDistPath)) {
    console.log(`[Static] Serving frontend from: ${clientDistPath}`);
    await fastify.register(fastifyStatic, {
      root: clientDistPath,
      prefix: '/',
    });

    // SPA fallback: redirect 404s on non-API routes to index.html
    fastify.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api') || request.url.startsWith('/ws')) {
        return reply.status(404).send({ error: 'Endpoint not found' });
      }
      return reply.sendFile('index.html');
    });
  } else {
    console.log('[Static] Frontend dist directory not found (running in backend-only / Vite dev mode)');
  }

  // 9. Start Server Listen
  try {
    await fastify.listen({
      port: config.PORT,
      host: config.HOST,
    });
    console.log(`[Server] NADI dashboard is running at http://${config.HOST}:${config.PORT}`);
  } catch (err) {
    console.error('[Server] Failed to start Fastify:', err);
    process.exit(1);
  }

  // 10. Start Background Poller & Cron Jobs
  poller.start();
  AggregationJob.start();
  PurgeJob.start();

  // Graceful shutdown handling
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
    poller.stop();
    AggregationJob.stop();
    PurgeJob.stop();
    await fastify.close();
    closeDatabase();
    console.log('[Server] Shutdown complete.');
    process.exit(0);
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}

startServer().catch((err) => {
  console.error('[Bootstrap] Fatal startup error:', err);
  process.exit(1);
});

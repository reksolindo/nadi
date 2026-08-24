import { FastifyPluginAsync } from 'fastify';
import { RawSamplesRepository } from '../db/raw-samples.js';
import { AggregatesRepository } from '../db/aggregates.js';

// ==========================================
// Historical Bandwidth Routes per User
// ==========================================

export const historyRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{
    Params: { username: string };
    Querystring: { range?: string };
  }>('/api/history/:username', async (request, reply) => {
    const { username } = request.params;
    const range = (request.query.range || '1h').toLowerCase();
    const now = Date.now();

    if (!username) {
      return reply.status(400).send({ error: 'Username is required' });
    }

    let dataPoints: any[] = [];
    let fromTs = 0;

    switch (range) {
      case '1h':
        fromTs = now - 3600 * 1000;
        dataPoints = RawSamplesRepository.getUserHistory(username, fromTs, now);
        break;

      case '24h':
        fromTs = now - 24 * 3600 * 1000;
        dataPoints = RawSamplesRepository.getUserHistory(username, fromTs, now);
        break;

      case '7d':
        fromTs = now - 7 * 24 * 3600 * 1000;
        dataPoints = AggregatesRepository.getUserHourlyHistory(username, fromTs, now);
        // If hourly records are sparse (e.g. system just started), fallback to raw
        if (dataPoints.length === 0) {
          dataPoints = RawSamplesRepository.getUserHistory(username, fromTs, now);
        }
        break;

      case '30d':
        fromTs = now - 30 * 24 * 3600 * 1000;
        dataPoints = AggregatesRepository.getUserHourlyHistory(username, fromTs, now);
        break;

      default:
        fromTs = now - 3600 * 1000;
        dataPoints = RawSamplesRepository.getUserHistory(username, fromTs, now);
    }

    return reply.send({
      success: true,
      username,
      range,
      fromTimestamp: fromTs,
      toTimestamp: now,
      count: dataPoints.length,
      data: dataPoints,
    });
  });
};

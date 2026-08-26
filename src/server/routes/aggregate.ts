import { FastifyPluginAsync } from 'fastify';
import { RawSamplesRepository } from '../db/raw-samples.js';
import { AggregatesRepository } from '../db/aggregates.js';
import { getIspCapacityMbps } from '../db/settings.js';

// ==========================================
// Aggregate Total Bandwidth Routes
// ==========================================

export const aggregateRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{
    Querystring: { range?: string };
  }>('/api/aggregate', async (request, reply) => {
    const range = (request.query.range || '1h').toLowerCase();
    const now = Date.now();

    let dataPoints: any[] = [];
    let fromTs = 0;

    switch (range) {
      case '1h':
        fromTs = now - 3600 * 1000;
        // Group raw samples in 10-second buckets
        dataPoints = RawSamplesRepository.getAggregateHistory(fromTs, now, 10);
        break;

      case '24h':
        fromTs = now - 24 * 3600 * 1000;
        // Group raw samples in 60-second buckets
        dataPoints = RawSamplesRepository.getAggregateHistory(fromTs, now, 60);
        break;

      case '7d':
        fromTs = now - 7 * 24 * 3600 * 1000;
        dataPoints = AggregatesRepository.getAggregateHourlyHistory(fromTs, now);
        if (dataPoints.length === 0) {
          dataPoints = RawSamplesRepository.getAggregateHistory(fromTs, now, 300);
        }
        break;

      case '30d':
        fromTs = now - 30 * 24 * 3600 * 1000;
        dataPoints = AggregatesRepository.getAggregateHourlyHistory(fromTs, now);
        break;

      default:
        fromTs = now - 3600 * 1000;
        dataPoints = RawSamplesRepository.getAggregateHistory(fromTs, now, 10);
    }

    return reply.send({
      success: true,
      range,
      capacityMbps: getIspCapacityMbps(),
      fromTimestamp: fromTs,
      toTimestamp: now,
      count: dataPoints.length,
      data: dataPoints,
    });
  });
};

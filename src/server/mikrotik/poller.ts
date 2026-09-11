import { MikrotikClient } from './client.js';
import { MockMikrotikGenerator } from './mock.js';
import { config } from '../config.js';
import {
  UserBandwidthSample,
  NetworkSummary,
  WebSocketMessage,
  UserTrafficAnalysis,
  SecuritySummary,
  HotspotHostItem,
  SecurityLogItem
} from '../types.js';
import { RawSamplesRepository } from '../db/raw-samples.js';
import { WebSocketHandler } from '../ws/handler.js';
import { ThreatAnalyzer } from './threat-analyzer.js';
import { SpeedTestService } from './speedtest.js';
import { IspHealthService } from './ispHealth.js';
import { getIspCapacityMbps } from '../db/settings.js';

// ==========================================
// Mikrotik Poller Service
// ==========================================

export class MikrotikPoller {
  private client: MikrotikClient;
  private mockGenerator: MockMikrotikGenerator;
  private timerHandle: NodeJS.Timeout | null = null;
  private isPolling = false;

  private lastPolledAt: number | null = null;
  private lastError: string | null = null;
  private latestSamples: UserBandwidthSample[] = [];
  private latestSummary: NetworkSummary | null = null;

  constructor() {
    this.client = new MikrotikClient({
      host: config.MIKROTIK_HOST,
      port: config.MIKROTIK_PORT,
      user: config.MIKROTIK_USER,
      password: config.MIKROTIK_PASSWORD,
      useTls: config.MIKROTIK_TLS,
      timeoutMs: config.MIKROTIK_TIMEOUT_MS,
    });

    this.mockGenerator = new MockMikrotikGenerator();
  }

  get status() {
    return {
      connected: this.client.connected || config.MOCK_MODE,
      lastPolledAt: this.lastPolledAt,
      lastError: this.lastError,
      mockMode: config.MOCK_MODE,
      activeUsersCount: this.latestSamples.length,
    };
  }

  get activeUsers(): UserBandwidthSample[] {
    return this.latestSamples;
  }

  get networkSummary(): NetworkSummary | null {
    return this.latestSummary;
  }

  /**
   * Start the periodic polling loop
   */
  start(): void {
    if (this.timerHandle) return;

    console.log(`[Poller] Starting poller service (interval: ${config.POLL_INTERVAL_MS}ms, mock: ${config.MOCK_MODE})`);
    
    // Initial run immediately
    this.poll();

    this.timerHandle = setInterval(() => {
      this.poll();
    }, config.POLL_INTERVAL_MS);
  }

  /**
   * Stop polling
   */
  stop(): void {
    if (this.timerHandle) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
    this.client.disconnect();
    console.log('[Poller] Stopped poller service');
  }

  /**
   * Execute single polling tick
   */
  private async poll(): Promise<void> {
    if (this.isPolling) return;
    this.isPolling = true;

    try {
      let samples: UserBandwidthSample[] = [];
      let wanSample: any = undefined;

      if (config.MOCK_MODE) {
        // Use Mock data
        samples = this.mockGenerator.generateSamples(config.POLL_INTERVAL_MS / 1000);
        wanSample = {
          interfaceName: 'ether11',
          rxRateBps: samples.reduce((acc, s) => acc + s.rxRateBps, 0),
          txRateBps: samples.reduce((acc, s) => acc + s.txRateBps, 0),
          rxPacketsPerSec: 1200,
          txPacketsPerSec: 650,
          dropsPerSec: 0,
          lastCheckedAt: Date.now(),
        };
        this.lastError = null;
      } else {
        // Connect to physical Mikrotik router
        try {
          if (!this.client.connected) {
            await this.client.connect();
            console.log(`[Poller] Connected to Mikrotik at ${config.MIKROTIK_HOST}:${config.MIKROTIK_PORT}`);
          }

          // Fetch active users, queues, and physical WAN interface throughput concurrently
          const [activeUsers, queues, wanTraffic] = await Promise.all([
            this.client.getHotspotActiveUsers(),
            this.client.getDynamicQueues(),
            this.client.getWanTraffic('ether11'),
          ]);

          samples = this.joinUsersAndQueues(activeUsers, queues);
          wanSample = wanTraffic;
          this.lastError = null;
        } catch (err: any) {
          this.lastError = err.message || 'Unknown router error';
          console.error(`[Poller] Router poll failed: ${this.lastError}`);
          this.client.disconnect();
          // Do not crash - poller will retry next tick
        }
      }

      this.lastPolledAt = Date.now();

      // Compute total WAN bandwidth for proportional destination calculation
      const totalWanThroughput = wanSample ? (wanSample.rxRateBps + wanSample.txRateBps) : 0;
      let liveDestinations: any[] = [];

      try {
        if (config.MOCK_MODE) {
          liveDestinations = this.mockGenerator.generateLiveDestinations(totalWanThroughput);
        } else if (this.client.connected) {
          liveDestinations = await this.client.getLiveTrafficDestinations(totalWanThroughput);
        }
      } catch (destErr: any) {
        console.warn(`[Poller] Destination traffic query failed: ${destErr.message}`);
      }

      // Multi-hop ISP health & packet loss barometer (uses 12s cache)
      let ispHealth;
      try {
        ispHealth = await IspHealthService.check(false);
      } catch (healthErr: any) {
        console.warn(`[Poller] ISP Health check failed: ${healthErr.message}`);
      }

      // Compute network summary with dynamic ISP capacity
      const summary = this.computeSummary(samples, wanSample, liveDestinations);
      if (ispHealth) {
        summary.ispHealth = ispHealth;
      }
      this.latestSamples = samples;
      this.latestSummary = summary;

      // 1. Persist raw samples to SQLite
      if (samples.length > 0) {
        try {
          RawSamplesRepository.insertBatch(samples);
        } catch (dbErr: any) {
          console.error(`[Poller] DB insert error: ${dbErr.message}`);
        }
      }

      // 2. Broadcast via WebSocket
      const wsMessage: WebSocketMessage = {
        type: 'snapshot',
        timestamp: this.lastPolledAt,
        summary,
        users: samples,
        routerConnected: this.client.connected || config.MOCK_MODE,
        routerError: this.lastError,
        latestSpeedTest: SpeedTestService.getLatest(),
        ispHealth,
      };

      WebSocketHandler.broadcast(wsMessage);

    } catch (unexpectedErr: any) {
      console.error(`[Poller] Unexpected error during poll cycle:`, unexpectedErr);
    } finally {
      this.isPolling = false;
    }
  }

  /**
   * Match Hotspot active users with dynamic queues by IP address / target / name
   */
  private joinUsersAndQueues(activeUsers: any[], queues: any[]): UserBandwidthSample[] {
    const now = Date.now();
    const queueMapByIp = new Map<string, any>();
    const queueMapByName = new Map<string, any>();

    for (const q of queues) {
      if (q.target) {
        // Strip CIDR prefix (e.g. 192.168.88.100/32 -> 192.168.88.100)
        const cleanIp = q.target.split('/')[0].trim();
        queueMapByIp.set(cleanIp, q);
      }
      if (q.name) {
        queueMapByName.set(q.name.toLowerCase(), q);
      }
    }

    const samples: UserBandwidthSample[] = [];

    for (const user of activeUsers) {
      const userIp = (user.address || '').trim();
      const userName = (user.user || '').trim();

      // Find matching queue by IP or username
      const matchedQueue = queueMapByIp.get(userIp) || queueMapByName.get(userName.toLowerCase());

      const txRateBps = matchedQueue ? matchedQueue.rateTx : 0;
      const rxRateBps = matchedQueue ? matchedQueue.rateRx : 0;
      const txBytes = matchedQueue ? matchedQueue.bytesTx : (user.bytesIn || 0);
      const rxBytes = matchedQueue ? matchedQueue.bytesRx : (user.bytesOut || 0);

      // Convert bps to bytes/sec
      const txRate = Math.round(txRateBps / 8);
      const rxRate = Math.round(rxRateBps / 8);

      samples.push({
        username: userName,
        macAddress: user.macAddress || '',
        ipAddress: userIp,
        txRate,
        rxRate,
        txRateBps,
        rxRateBps,
        txBytes,
        rxBytes,
        uptime: user.uptime,
        timestamp: now,
      });
    }

    // Sort by download rate descending
    samples.sort((a, b) => b.rxRate - a.rxRate);

    return samples;
  }

  /**
   * Compute aggregate statistics and identify top consumer using dynamic ISP capacity
   */
  private computeSummary(samples: UserBandwidthSample[], wanSample?: any, liveDestinations?: any[]): NetworkSummary {
    let totalRxRate = 0;
    let totalTxRate = 0;
    let totalRxRateBps = 0;
    let totalTxRateBps = 0;

    let topConsumerSample: UserBandwidthSample | null = null;
    let maxRx = -1;

    for (const s of samples) {
      totalRxRate += s.rxRate;
      totalTxRate += s.txRate;
      totalRxRateBps += s.rxRateBps;
      totalTxRateBps += s.txRateBps;

      if (s.rxRate > maxRx) {
        maxRx = s.rxRate;
        topConsumerSample = s;
      }
    }

    // Use physical WAN throughput if available, otherwise sum of hotspot users
    const effectiveTotalRxBps = wanSample?.rxRateBps ? Math.max(wanSample.rxRateBps, totalRxRateBps) : totalRxRateBps;
    const effectiveTotalTxBps = wanSample?.txRateBps ? Math.max(wanSample.txRateBps, totalTxRateBps) : totalTxRateBps;

    // Dynamically retrieve configured ISP capacity from DB settings
    const capacityMbps = getIspCapacityMbps();
    const capacityBps = capacityMbps * 1_000_000;
    const totalBandwidthBps = effectiveTotalRxBps + effectiveTotalTxBps;
    const utilizationPercent = capacityBps > 0
      ? Math.min(100, (totalBandwidthBps / capacityBps) * 100)
      : 0;

    const summary: NetworkSummary = {
      timestamp: Date.now(),
      totalActiveUsers: samples.length,
      totalTxRate,
      totalRxRate,
      totalTxRateBps,
      totalRxRateBps,
      capacityMbps,
      utilizationPercent: Math.round(utilizationPercent * 10) / 10,
      wanInterface: wanSample,
      liveDestinations: liveDestinations || this.latestSummary?.liveDestinations,
      topConsumer: topConsumerSample ? {
        username: topConsumerSample.username,
        ipAddress: topConsumerSample.ipAddress,
        macAddress: topConsumerSample.macAddress,
        rxRate: topConsumerSample.rxRate,
        txRate: topConsumerSample.txRate,
        rxRateBps: topConsumerSample.rxRateBps,
        txRateBps: topConsumerSample.txRateBps,
      } : undefined,
    };

    return summary;
  }

  /**
   * Broadcast immediate summary update (e.g. after ISP capacity config change)
   */
  public refreshSummary(): void {
    if (this.latestSamples) {
      const summary = this.computeSummary(this.latestSamples, this.latestSummary?.wanInterface, this.latestSummary?.liveDestinations);
      this.latestSummary = summary;
      const wsMessage: WebSocketMessage = {
        type: 'snapshot',
        timestamp: Date.now(),
        summary,
        users: this.latestSamples,
        routerConnected: this.client.connected || config.MOCK_MODE,
        routerError: this.lastError,
        latestSpeedTest: SpeedTestService.getLatest(),
      };
      WebSocketHandler.broadcast(wsMessage);
    }
  }

  /**
   * Get underlying Mikrotik client instance
   */
  public getClient(): MikrotikClient {
    return this.client;
  }

  /**
   * Inspect active traffic for a specific user IP
   */
  async inspectUserTraffic(userIp: string, username?: string): Promise<UserTrafficAnalysis> {
    if (config.MOCK_MODE) {
      return this.mockGenerator.generateTrafficAnalysis(userIp, username);
    }

    try {
      if (!this.client.connected) {
        await this.client.connect();
      }
      return await this.client.getUserTrafficBreakdown(userIp, username);
    } catch (err: any) {
      console.warn(`[Poller] Traffic inspection error for ${userIp}:`, err.message);
      // Fallback to basic analysis
      return {
        userIp,
        username,
        totalConnections: 0,
        dominantCategory: 'Web & Cloud Services',
        categories: [],
        connections: [],
        analyzedAt: Date.now(),
      };
    }
  }

  /**
   * Get network access attempts, unauthenticated hosts, and security logs
   */
  async getSecurityAudit(): Promise<SecuritySummary> {
    if (config.MOCK_MODE) {
      const unauthorizedHosts = this.mockGenerator.generateHotspotHosts();
      const recentLogs = this.mockGenerator.generateSecurityLogs();
      const failedCount = recentLogs.filter(l => l.severity === 'error' || l.type === 'hotspot_login_failed').length;
      const threatMap = ThreatAnalyzer.processLogs(recentLogs, true);

      return {
        unauthorizedHostsCount: unauthorizedHosts.length,
        totalHostsCount: unauthorizedHosts.length + this.latestSamples.length,
        recentFailedLoginsCount: failedCount,
        recentLogs,
        unauthorizedHosts,
        threatMap,
        lastCheckedAt: Date.now(),
      };
    }

    try {
      if (!this.client.connected) {
        await this.client.connect();
      }

      // Fetch hosts, raw security logs, and firewall drop logs
      const [allHosts, allLogs, rawFirewallLogs] = await Promise.all([
        this.client.getHotspotHosts(),
        this.client.getSecurityLogs(),
        this.client.executeCommand(['/log/print']).catch(() => []),
      ]);

      const unauthorizedHosts = allHosts.filter(h => !h.authorized && !h.bypassed);
      const failedCount = allLogs.filter(l => l.severity === 'error' || l.type === 'hotspot_login_failed').length;
      const threatMap = ThreatAnalyzer.processLogs(rawFirewallLogs.filter(s => s.type === '!re'), false);

      return {
        unauthorizedHostsCount: unauthorizedHosts.length,
        totalHostsCount: allHosts.length,
        recentFailedLoginsCount: failedCount,
        recentLogs: allLogs,
        unauthorizedHosts,
        threatMap,
        lastCheckedAt: Date.now(),
      };
    } catch (err: any) {
      console.error('[Poller] Security audit fetch failed:', err.message);
      const threatMap = ThreatAnalyzer.processLogs([], false);
      return {
        unauthorizedHostsCount: 0,
        totalHostsCount: this.latestSamples.length,
        recentFailedLoginsCount: 0,
        recentLogs: [],
        unauthorizedHosts: [],
        threatMap,
        lastCheckedAt: Date.now(),
      };
    }
  }
}

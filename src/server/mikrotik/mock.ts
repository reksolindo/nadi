import {
  UserBandwidthSample,
  UserTrafficAnalysis,
  UserConnectionDetail,
  TrafficCategoryBreakdown,
  HotspotHostItem,
  SecurityLogItem
} from '../types.js';

// ==========================================
// Mock Mikrotik Data Generator (Dev/Offline)
// ==========================================

interface MockUserProfile {
  username: string;
  mac: string;
  ip: string;
  baseDownloadMbps: number;
  baseUploadMbps: number;
  burstProbability: number;
  burstMultiplier: number;
  cumulativeRx: number;
  cumulativeTx: number;
}

export class MockMikrotikGenerator {
  private users: MockUserProfile[] = [
    { username: 'budi.santoso', mac: '58:D9:C3:11:22:33', ip: '192.168.88.101', baseDownloadMbps: 8.5, baseUploadMbps: 1.2, burstProbability: 0.3, burstMultiplier: 4.5, cumulativeRx: 1024 * 1024 * 500, cumulativeTx: 1024 * 1024 * 40 },
    { username: 'ani.wijaya', mac: 'AC:BC:32:44:55:66', ip: '192.168.88.102', baseDownloadMbps: 18.0, baseUploadMbps: 2.5, burstProbability: 0.5, burstMultiplier: 3.8, cumulativeRx: 1024 * 1024 * 1200, cumulativeTx: 1024 * 1024 * 150 },
    { username: 'dewi.lestari', mac: '74:D0:2B:77:88:99', ip: '192.168.88.103', baseDownloadMbps: 4.0, baseUploadMbps: 0.8, burstProbability: 0.2, burstMultiplier: 2.0, cumulativeRx: 1024 * 1024 * 350, cumulativeTx: 1024 * 1024 * 30 },
    { username: 'reza.pratama', mac: 'DC:A6:32:AA:BB:CC', ip: '192.168.88.104', baseDownloadMbps: 42.0, baseUploadMbps: 8.0, burstProbability: 0.4, burstMultiplier: 2.5, cumulativeRx: 1024 * 1024 * 4500, cumulativeTx: 1024 * 1024 * 600 },
    { username: 'hendra.gunawan', mac: 'B8:27:EB:12:34:56', ip: '192.168.88.105', baseDownloadMbps: 2.5, baseUploadMbps: 0.5, burstProbability: 0.1, burstMultiplier: 1.5, cumulativeRx: 1024 * 1024 * 200, cumulativeTx: 1024 * 1024 * 20 },
    { username: 'maya.putri', mac: '3C:22:FB:65:43:21', ip: '192.168.88.106', baseDownloadMbps: 12.0, baseUploadMbps: 1.8, burstProbability: 0.25, burstMultiplier: 3.0, cumulativeRx: 1024 * 1024 * 850, cumulativeTx: 1024 * 1024 * 80 },
    { username: 'eko.prasetyo', mac: '94:E6:86:DD:EE:FF', ip: '192.168.88.107', baseDownloadMbps: 6.0, baseUploadMbps: 1.0, burstProbability: 0.2, burstMultiplier: 2.2, cumulativeRx: 1024 * 1024 * 400, cumulativeTx: 1024 * 1024 * 35 },
    { username: 'siti.nurhaliza', mac: '18:65:90:11:AA:22', ip: '192.168.88.108', baseDownloadMbps: 1.5, baseUploadMbps: 0.3, burstProbability: 0.15, burstMultiplier: 2.0, cumulativeRx: 1024 * 1024 * 180, cumulativeTx: 1024 * 1024 * 15 },
    { username: 'dimas.anggara', mac: '60:45:CB:33:BB:44', ip: '192.168.88.109', baseDownloadMbps: 28.5, baseUploadMbps: 5.2, burstProbability: 0.35, burstMultiplier: 2.8, cumulativeRx: 1024 * 1024 * 2800, cumulativeTx: 1024 * 1024 * 320 },
    { username: 'fajar.nugroho', mac: 'E8:80:2E:55:CC:66', ip: '192.168.88.110', baseDownloadMbps: 3.2, baseUploadMbps: 0.6, burstProbability: 0.1, burstMultiplier: 1.8, cumulativeRx: 1024 * 1024 * 290, cumulativeTx: 1024 * 1024 * 25 },
    { username: 'rina.susanti', mac: '20:16:B9:77:DD:88', ip: '192.168.88.111', baseDownloadMbps: 15.4, baseUploadMbps: 2.1, burstProbability: 0.3, burstMultiplier: 3.2, cumulativeRx: 1024 * 1024 * 1400, cumulativeTx: 1024 * 1024 * 120 },
    { username: 'agus.setiawan', mac: '4C:32:75:99:EE:00', ip: '192.168.88.112', baseDownloadMbps: 5.0, baseUploadMbps: 0.9, burstProbability: 0.2, burstMultiplier: 2.0, cumulativeRx: 1024 * 1024 * 420, cumulativeTx: 1024 * 1024 * 40 },
    { username: 'putri.ayuningtyas', mac: '80:EA:96:12:12:12', ip: '192.168.88.113', baseDownloadMbps: 9.8, baseUploadMbps: 1.4, burstProbability: 0.2, burstMultiplier: 2.5, cumulativeRx: 1024 * 1024 * 720, cumulativeTx: 1024 * 1024 * 65 },
    { username: 'bayu.pamungkas', mac: 'A4:C3:F0:34:34:34', ip: '192.168.88.114', baseDownloadMbps: 35.0, baseUploadMbps: 6.5, burstProbability: 0.45, burstMultiplier: 2.2, cumulativeRx: 1024 * 1024 * 3900, cumulativeTx: 1024 * 1024 * 450 },
    { username: 'lia.kurnia', mac: 'F4:F5:DB:56:56:56', ip: '192.168.88.115', baseDownloadMbps: 2.0, baseUploadMbps: 0.4, burstProbability: 0.1, burstMultiplier: 1.5, cumulativeRx: 1024 * 1024 * 150, cumulativeTx: 1024 * 1024 * 12 },
    { username: 'dani.ramadhan', mac: '30:9C:23:78:78:78', ip: '192.168.88.116', baseDownloadMbps: 11.2, baseUploadMbps: 1.7, burstProbability: 0.25, burstMultiplier: 2.6, cumulativeRx: 1024 * 1024 * 880, cumulativeTx: 1024 * 1024 * 90 },
    { username: 'tari.wulandari', mac: 'C8:69:CD:90:90:90', ip: '192.168.88.117', baseDownloadMbps: 7.6, baseUploadMbps: 1.1, burstProbability: 0.2, burstMultiplier: 2.1, cumulativeRx: 1024 * 1024 * 510, cumulativeTx: 1024 * 1024 * 48 },
    { username: 'arif.hidayat', mac: '68:DB:F5:AB:CD:EF', ip: '192.168.88.118', baseDownloadMbps: 22.0, baseUploadMbps: 3.4, burstProbability: 0.3, burstMultiplier: 3.0, cumulativeRx: 1024 * 1024 * 2100, cumulativeTx: 1024 * 1024 * 230 },
  ];

  generateSamples(intervalSeconds = 5): UserBandwidthSample[] {
    const now = Date.now();

    return this.users.map((user) => {
      // Simulate random spikes and variations
      const isBursting = Math.random() < user.burstProbability;
      const noise = 0.7 + Math.random() * 0.6; // 70% - 130%
      const multiplier = isBursting ? user.burstMultiplier * noise : noise;

      const rxMbps = Math.max(0.05, user.baseDownloadMbps * multiplier);
      const txMbps = Math.max(0.02, user.baseUploadMbps * multiplier);

      const rxRateBps = Math.round(rxMbps * 1_000_000);
      const txRateBps = Math.round(txMbps * 1_000_000);

      const rxRateBytes = Math.round(rxRateBps / 8);
      const txRateBytes = Math.round(txRateBps / 8);

      user.cumulativeRx += rxRateBytes * intervalSeconds;
      user.cumulativeTx += txRateBytes * intervalSeconds;

      return {
        username: user.username,
        macAddress: user.mac,
        ipAddress: user.ip,
        rxRate: rxRateBytes,
        txRate: txRateBytes,
        rxRateBps,
        txRateBps,
        rxBytes: user.cumulativeRx,
        txBytes: user.cumulativeTx,
        uptime: '2h15m',
        timestamp: now,
      };
    });
  }

  generateTrafficAnalysis(userIp: string, username?: string): UserTrafficAnalysis {
    const connections: UserConnectionDetail[] = [
      { id: 'c1', protocol: 'tcp', srcAddress: `${userIp}:52140`, dstAddress: '142.250.185.206:443', dstPort: 443, serviceName: 'YouTube / Google Video CDN', category: 'Streaming & Media', origRateBps: 125000, replRateBps: 28500000, state: 'established' },
      { id: 'c2', protocol: 'tcp', srcAddress: `${userIp}:52142`, dstAddress: '104.16.132.229:443', dstPort: 443, serviceName: 'Cloudflare CDN', category: 'Web & Cloud Services', origRateBps: 45000, replRateBps: 4500000, state: 'established' },
      { id: 'c3', protocol: 'udp', srcAddress: `${userIp}:50004`, dstAddress: '170.114.10.12:3478', dstPort: 3478, serviceName: 'Zoom Meetings (Audio/Video)', category: 'VoIP & Meetings', origRateBps: 1850000, replRateBps: 2200000, state: 'active' },
      { id: 'c4', protocol: 'tcp', srcAddress: `${userIp}:52148`, dstAddress: '52.96.166.130:443', dstPort: 443, serviceName: 'Microsoft 365 / Teams', category: 'Web & Cloud Services', origRateBps: 80000, replRateBps: 1200000, state: 'established' },
      { id: 'c5', protocol: 'tcp', srcAddress: `${userIp}:52150`, dstAddress: '162.159.130.233:8443', dstPort: 8443, serviceName: 'Direct Download Stream', category: 'File Transfer & Downloads', origRateBps: 12000, replRateBps: 8900000, state: 'established' },
    ];

    const categories: TrafficCategoryBreakdown[] = [
      { category: 'Streaming & Media', connectionCount: 14, percentage: 55, topServices: ['YouTube Video CDN', 'Netflix Streaming'], estimatedRateBps: 28500000 },
      { category: 'Web & Cloud Services', connectionCount: 8, percentage: 25, topServices: ['Cloudflare', 'Microsoft 365'], estimatedRateBps: 5700000 },
      { category: 'VoIP & Meetings', connectionCount: 3, percentage: 12, topServices: ['Zoom Video Conference'], estimatedRateBps: 4050000 },
      { category: 'File Transfer & Downloads', connectionCount: 2, percentage: 8, topServices: ['Direct HTTP Download'], estimatedRateBps: 8900000 },
    ];

    return {
      userIp,
      username: username || 'User',
      totalConnections: 27,
      dominantCategory: 'Streaming & Media',
      categories,
      connections,
      analyzedAt: Date.now(),
    };
  }

  generateHotspotHosts(): HotspotHostItem[] {
    const now = Date.now();
    return [
      { id: '*h1', macAddress: '70:85:C2:AA:11:22', ipAddress: '192.168.41.201', server: 'hotspot1', authorized: false, bypassed: false, bytesIn: 24500, bytesOut: 18200, packetsIn: 120, packetsOut: 90, uptime: '12m30s', idleTime: '1m10s', comment: 'Galaxy-A54-WaitingAuth', seenAt: now },
      { id: '*h2', macAddress: '88:66:5A:33:44:55', ipAddress: '192.168.41.202', server: 'hotspot1', authorized: false, bypassed: false, bytesIn: 12400, bytesOut: 9800, packetsIn: 64, packetsOut: 45, uptime: '4m15s', idleTime: '25s', comment: 'iPhone-Guest-Pending', seenAt: now },
      { id: '*h3', macAddress: '34:2E:B7:77:88:99', ipAddress: '192.168.41.203', server: 'hotspot1', authorized: false, bypassed: false, bytesIn: 54000, bytesOut: 42000, packetsIn: 280, packetsOut: 210, uptime: '45m00s', idleTime: '8m20s', comment: 'Laptop-Tamu-CaptivePortal', seenAt: now },
    ];
  }

  generateSecurityLogs(): SecurityLogItem[] {
    const now = Date.now();
    return [
      { id: 'log-1', time: '16:48:12', timestamp: now - 120000, topics: ['hotspot', 'info'], message: 'user tamu-01 (192.168.41.201): login failed: invalid username or password', severity: 'error', type: 'hotspot_login_failed', targetUser: 'tamu-01', targetIp: '192.168.41.201', targetMac: '70:85:C2:AA:11:22' },
      { id: 'log-2', time: '16:45:00', timestamp: now - 310000, topics: ['hotspot', 'warning'], message: 'user budi.santoso (192.168.41.101): login failed: already logged in on another device', severity: 'warning', type: 'user_duplicate', targetUser: 'budi.santoso', targetIp: '192.168.41.101' },
      { id: 'log-3', time: '16:42:30', timestamp: now - 460000, topics: ['hotspot', 'info'], message: 'user reza.pratama (192.168.41.104): logged in from 192.168.41.104 (DC:A6:32:AA:BB:CC)', severity: 'info', type: 'hotspot_login_success', targetUser: 'reza.pratama', targetIp: '192.168.41.104', targetMac: 'DC:A6:32:AA:BB:CC' },
      { id: 'log-4', time: '16:38:15', timestamp: now - 720000, topics: ['account', 'warning'], message: 'system: login failed for user testadmin from 192.168.41.203 via winbox', severity: 'error', type: 'router_auth_failed', targetUser: 'testadmin', targetIp: '192.168.41.203' },
    ];
  }
}

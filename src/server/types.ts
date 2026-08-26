// ==========================================
// NADI — Shared Types & Interfaces
// ==========================================

export interface UserBandwidthSample {
  username: string;
  macAddress: string;
  ipAddress: string;
  txRate: number;      // Upload rate in bytes/sec
  rxRate: number;      // Download rate in bytes/sec
  txRateBps: number;   // Upload rate in bits/sec (raw RouterOS value)
  rxRateBps: number;   // Download rate in bits/sec (raw RouterOS value)
  txBytes: number;     // Total upload bytes (cumulative)
  rxBytes: number;     // Total download bytes (cumulative)
  uptime?: string;     // Hotspot session uptime (e.g., '1h24m')
  timestamp: number;   // Epoch milliseconds
}

export interface WanInterfaceSample {
  interfaceName: string;    // 'ether11'
  rxRateBps: number;        // Actual live download bits/sec from ISP
  txRateBps: number;        // Actual live upload bits/sec to ISP
  rxPacketsPerSec: number;  // Packets received per sec
  txPacketsPerSec: number;  // Packets sent per sec
  dropsPerSec: number;      // Dropped packets
  lastCheckedAt: number;
}

export interface SpeedTestResult {
  id: string;
  timestamp: number;
  timeStr: string;
  pingMs: number;
  jitterMs: number;
  downloadMbps: number;
  uploadMbps: number;
  capacityMbps: number;
  ispDeliveryPercent: number; // e.g. (downloadMbps / 200) * 100
  qualityRating: 'excellent' | 'good' | 'degraded' | 'poor';
  serverName: string;
  clientIp?: string;
}

export interface LiveTrafficDestination {
  id: string;
  name: string;               // e.g. "YouTube Video Stream"
  category: string;           // e.g. "Streaming & Media"
  badge: string;              // e.g. "Google Video CDN"
  explanation: string;        // e.g. "Streaming video buffer / playback chunk"
  appIconKey: string;         // e.g. "youtube", "meta", "tiktok", "zoom", "windows", etc.
  downloadRateBps: number;    // Live download bits/sec
  uploadRateBps: number;      // Live upload bits/sec
  totalRateBps: number;       // download + upload bits/sec
  percentageOfWan: number;    // % share of total active traffic
  activeStreamsCount: number; // Number of active connection flows
  sampleDomain?: string;      // e.g. "rr3.sn-ojnpo5-5j.googlevideo.com"
}

export interface NetworkSummary {
  timestamp: number;
  totalActiveUsers: number;
  totalTxRate: number;     // Total upload rate in bytes/sec
  totalRxRate: number;     // Total download rate in bytes/sec
  totalTxRateBps: number;  // Total upload rate in bits/sec
  totalRxRateBps: number;  // Total download rate in bits/sec
  capacityMbps: number;    // ISP Capacity (e.g. 200)
  utilizationPercent: number; // (Total download + upload rate) / Capacity * 100
  wanInterface?: WanInterfaceSample; // Real-time WAN (ether11) physical throughput
  liveDestinations?: LiveTrafficDestination[]; // Real-time traffic destination & app breakdown
  topConsumer?: {
    username: string;
    ipAddress: string;
    macAddress: string;
    rxRate: number;
    txRate: number;
    rxRateBps: number;
    txRateBps: number;
  };
}

export interface WebSocketMessage {
  type: 'snapshot' | 'status';
  timestamp: number;
  summary: NetworkSummary;
  users: UserBandwidthSample[];
  routerConnected: boolean;
  routerError?: string | null;
  securitySummary?: SecuritySummary;
  latestSpeedTest?: SpeedTestResult;
}

export interface HistoricalDataPoint {
  timestamp: number;
  txRate: number;     // bytes/sec
  rxRate: number;     // bytes/sec
  txRateBps: number;  // bits/sec
  rxRateBps: number;  // bits/sec
  totalTxBytes?: number;
  totalRxBytes?: number;
}

export interface AggregateDataPoint {
  timestamp: number;
  totalTxRate: number;     // bytes/sec
  totalRxRate: number;     // bytes/sec
  totalTxRateBps: number;  // bits/sec
  totalRxRateBps: number;  // bits/sec
  capacityMbps: number;
  utilizationPercent: number;
  activeUsersCount?: number;
}

// ----------------------------------------------------
// Traffic Breakdown & Inspector (Why is user top consumer?)
// ----------------------------------------------------

export interface UserConnectionDetail {
  id: string;
  protocol: string;       // 'tcp', 'udp', 'icmp'
  srcAddress: string;     // e.g. 192.168.41.66:54321
  dstAddress: string;     // e.g. 142.250.185.206:443
  dstPort: number;
  domainName?: string;    // Exact website / domain name resolved from Mikrotik DNS Cache (e.g. 'www.google.com', 'whatsapp.net')
  serviceName: string;    // e.g. 'HTTPS / Web', 'YouTube / CDN', 'Zoom VoIP'
  category: string;       // 'Streaming & Media', 'Web & Cloud', 'File Transfer / Downloads', 'VoIP & Meetings', 'Gaming', 'Other'
  origRateBps?: number;
  replRateBps?: number;
  origBytes?: number;
  replBytes?: number;
  state?: string;         // 'established', 'syn-sent'
}

export interface TrafficCategoryBreakdown {
  category: string;
  connectionCount: number;
  percentage: number;
  topServices: string[];
  estimatedRateBps: number;
}

export interface UserTrafficAnalysis {
  userIp: string;
  username?: string;
  totalConnections: number;
  dominantCategory: string;
  categories: TrafficCategoryBreakdown[];
  connections: UserConnectionDetail[];
  analyzedAt: number;
}

// ----------------------------------------------------
// Network Access & Security Attempt Monitoring
// ----------------------------------------------------

export interface HotspotHostItem {
  id: string;
  macAddress: string;
  ipAddress: string;
  server?: string;
  authorized: boolean;    // true = logged in, false = waiting at captive portal
  bypassed: boolean;      // true = IP/MAC binding bypass
  bytesIn: number;
  bytesOut: number;
  packetsIn: number;
  packetsOut: number;
  uptime?: string;
  idleTime?: string;
  comment?: string;
  seenAt: number;
}

export interface SecurityLogItem {
  id: string;
  time: string;           // '16:45:12' or 'aug/24 16:45'
  timestamp: number;
  topics: string[];       // ['hotspot', 'info', 'account']
  message: string;        // 'user duddy login failed: invalid password'
  severity: 'warning' | 'error' | 'info';
  type: 'hotspot_login_failed' | 'hotspot_login_success' | 'user_duplicate' | 'router_auth_failed' | 'other';
  targetUser?: string;
  targetIp?: string;
  targetMac?: string;
}

export interface AttackEvent {
  id: string;
  timestamp: number;
  timeStr: string;
  sourceIp: string;
  countryCode: string;
  countryName: string;
  city: string;
  lat: number;
  lng: number;
  targetPort: number;
  targetService: string;
  protocol: 'TCP' | 'UDP' | 'ICMP';
  flagEmoji: string;
  action: 'blocked' | 'dropped';
  rawMessage?: string;
}

export interface ThreatMapSummary {
  totalAttacks24h: number;
  activeAttacks: AttackEvent[];
  topCountries: Array<{
    countryCode: string;
    countryName: string;
    count: number;
    percentage: number;
    flagEmoji: string;
  }>;
  topTargetPorts: Array<{
    port: number;
    service: string;
    count: number;
    percentage: number;
  }>;
  officeLocation: {
    name: string;
    lat: number;
    lng: number;
  };
  lastUpdated: number;
}

export interface SecuritySummary {
  unauthorizedHostsCount: number;
  totalHostsCount: number;
  recentFailedLoginsCount: number;
  recentLogs: SecurityLogItem[];
  unauthorizedHosts: HotspotHostItem[];
  threatMap: ThreatMapSummary;
  lastCheckedAt: number;
}

export interface SystemStatus {
  app: {
    name: string;
    version: string;
    uptimeSeconds: number;
    memoryMb: number;
  };
  router: {
    host: string;
    port: number;
    connected: boolean;
    lastPolledAt: number | null;
    lastError: string | null;
    mockMode: boolean;
  };
  database: {
    rawSamplesCount: number;
    hourlyAggregatesCount: number;
    dailyAggregatesCount: number;
    sizeBytes: number;
  };
}

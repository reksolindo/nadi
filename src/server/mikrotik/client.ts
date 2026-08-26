import net from 'node:net';
import tls from 'node:tls';
import { RouterOSProtocol, RouterOSSentence } from './protocol.js';
import type {
  UserTrafficAnalysis,
  UserConnectionDetail,
  TrafficCategoryBreakdown,
  HotspotHostItem,
  SecurityLogItem,
  WanInterfaceSample,
  LiveTrafficDestination
} from '../types.js';

// ==========================================
// Mikrotik RouterOS Client Implementation
// ==========================================

export interface MikrotikClientOptions {
  host: string;
  port?: number;
  user?: string;
  password?: string;
  useTls?: boolean;
  timeoutMs?: number;
}

export interface HotspotActiveUser {
  id: string;
  user: string;
  address: string;
  macAddress: string;
  uptime?: string;
  bytesIn?: number;
  bytesOut?: number;
}

export interface SimpleQueueItem {
  id: string;
  name: string;
  target: string;
  rateTx: number; // bps
  rateRx: number; // bps
  bytesTx: number; // cumulative bytes
  bytesRx: number; // cumulative bytes
  dynamic: boolean;
}

export class MikrotikClient {
  private host: string;
  private port: number;
  private user: string;
  private password: string;
  private useTls: boolean;
  private timeoutMs: number;

  private socket: net.Socket | tls.TLSSocket | null = null;
  private isConnected = false;
  private isLoggingIn = false;
  private incomingBuffer: Buffer = Buffer.alloc(0);

  private pendingQueue: {
    sentenceWords: string[];
    resolve: (sentences: RouterOSSentence[]) => void;
    reject: (err: Error) => void;
    receivedSentences: RouterOSSentence[];
  }[] = [];

  private currentCommand: {
    sentenceWords: string[];
    resolve: (sentences: RouterOSSentence[]) => void;
    reject: (err: Error) => void;
    receivedSentences: RouterOSSentence[];
    timeoutHandle?: NodeJS.Timeout;
  } | null = null;

  constructor(options: MikrotikClientOptions) {
    this.host = options.host;
    this.port = options.port || 8728;
    this.user = options.user || 'admin';
    this.password = options.password || '';
    this.useTls = options.useTls || false;
    this.timeoutMs = options.timeoutMs || 5000;
  }

  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Connect and authenticate to RouterOS API
   */
  async connect(): Promise<void> {
    if (this.isConnected) return;

    return new Promise<void>((resolve, reject) => {
      let connectionTimeout: NodeJS.Timeout | null = null;

      const cleanup = () => {
        if (connectionTimeout) clearTimeout(connectionTimeout);
      };

      const socketOptions = {
        host: this.host,
        port: this.port,
        rejectUnauthorized: false,
      };

      const onConnect = async () => {
        cleanup();
        this.socket!.removeAllListeners('error');
        this.socket!.removeAllListeners('timeout');

        // Setup persistent listeners
        this.socket!.on('data', (chunk) => this.handleData(chunk));
        this.socket!.on('error', (err) => this.handleSocketError(err));
        this.socket!.on('close', () => this.handleSocketClose());

        try {
          await this.login();
          this.isConnected = true;
          resolve();
        } catch (loginErr) {
          this.disconnect();
          reject(loginErr);
        }
      };

      connectionTimeout = setTimeout(() => {
        cleanup();
        if (this.socket) {
          this.socket.destroy();
          this.socket = null;
        }
        reject(new Error(`Connection timeout to Mikrotik router at ${this.host}:${this.port}`));
      }, this.timeoutMs);

      try {
        if (this.useTls) {
          this.socket = tls.connect(socketOptions, onConnect);
        } else {
          this.socket = net.connect(socketOptions, onConnect);
        }

        this.socket.once('error', (err) => {
          cleanup();
          reject(err);
        });
      } catch (err) {
        cleanup();
        reject(err);
      }
    });
  }

  /**
   * Disconnect cleanly
   */
  disconnect(): void {
    this.isConnected = false;
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.destroy();
      this.socket = null;
    }
    this.incomingBuffer = Buffer.alloc(0);

    if (this.currentCommand) {
      if (this.currentCommand.timeoutHandle) clearTimeout(this.currentCommand.timeoutHandle);
      this.currentCommand.reject(new Error('Socket disconnected while executing command'));
      this.currentCommand = null;
    }

    while (this.pendingQueue.length > 0) {
      const item = this.pendingQueue.shift();
      item?.reject(new Error('Socket disconnected'));
    }
  }

  /**
   * RouterOS Login workflow (handles modern v6.43+/v7 direct login and legacy <=v6.42 challenge-response)
   */
  private async login(): Promise<void> {
    this.isLoggingIn = true;
    try {
      // Step 1: Try modern RouterOS (v6.43+ / v7) direct login first
      const sentences = await this.executeCommand([
        '/login',
        `=name=${this.user}`,
        `=password=${this.password}`,
      ]);

      const done = sentences[sentences.length - 1];
      if (done?.type === '!done') {
        if (done.attributes['ret']) {
          // Legacy RouterOS <= 6.42 fallback challenge
          const challenge = done.attributes['ret'];
          const challengeResponse = RouterOSProtocol.computeChallengeResponse(this.password, challenge);
          const secondAttempt = await this.executeCommand([
            '/login',
            `=name=${this.user}`,
            `=response=00${challengeResponse}`,
          ]);
          const secondDone = secondAttempt[secondAttempt.length - 1];
          if (secondDone?.type !== '!done') {
            throw new Error(`Challenge authentication failed: ${JSON.stringify(secondAttempt)}`);
          }
        }
        return;
      } else if (done?.type === '!trap') {
        throw new Error(`Mikrotik login failed: ${done.attributes['message'] || 'Invalid credentials'}`);
      } else {
        throw new Error(`Unexpected login response: ${JSON.stringify(sentences)}`);
      }
    } finally {
      this.isLoggingIn = false;
    }
  }

  /**
   * Execute raw sentence command
   */
  async executeCommand(sentenceWords: string[]): Promise<RouterOSSentence[]> {
    if (!this.socket && !this.isLoggingIn) {
      throw new Error('Not connected to Mikrotik router');
    }

    return new Promise<RouterOSSentence[]>((resolve, reject) => {
      this.pendingQueue.push({
        sentenceWords,
        resolve,
        reject,
        receivedSentences: [],
      });

      this.processQueue();
    });
  }

  private processQueue(): void {
    if (this.currentCommand || this.pendingQueue.length === 0 || !this.socket) {
      return;
    }

    this.currentCommand = this.pendingQueue.shift()!;
    const { sentenceWords } = this.currentCommand;

    this.currentCommand.timeoutHandle = setTimeout(() => {
      if (this.currentCommand) {
        const cmd = this.currentCommand;
        this.currentCommand = null;
        cmd.reject(new Error(`Command timeout: ${sentenceWords[0]}`));
        this.processQueue();
      }
    }, this.timeoutMs);

    const encoded = RouterOSProtocol.encodeSentence(sentenceWords);
    this.socket.write(encoded);
  }

  private handleData(chunk: Buffer): void {
    this.incomingBuffer = Buffer.concat([this.incomingBuffer, chunk]) as Buffer;

    const { sentences, remaining } = RouterOSProtocol.decodeStream(this.incomingBuffer);
    this.incomingBuffer = Buffer.from(remaining);

    for (const sentence of sentences) {
      if (!this.currentCommand) continue;

      this.currentCommand.receivedSentences.push(sentence);

      if (sentence.type === '!done' || sentence.type === '!trap' || sentence.type === '!fatal') {
        const cmd = this.currentCommand;
        this.currentCommand = null;
        if (cmd.timeoutHandle) clearTimeout(cmd.timeoutHandle);

        if (sentence.type === '!trap' || sentence.type === '!fatal') {
          cmd.reject(new Error(`RouterOS Error [${sentence.type}]: ${sentence.attributes['message'] || JSON.stringify(sentence.attributes)}`));
        } else {
          cmd.resolve(cmd.receivedSentences);
        }

        this.processQueue();
      }
    }
  }

  private handleSocketError(err: Error): void {
    console.error(`[MikrotikClient] Socket error: ${err.message}`);
    this.disconnect();
  }

  private handleSocketClose(): void {
    if (this.isConnected) {
      console.warn('[MikrotikClient] Socket closed by remote router');
    }
    this.disconnect();
  }

  /**
   * Fetch active hotspot users from /ip/hotspot/active
   */
  async getHotspotActiveUsers(): Promise<HotspotActiveUser[]> {
    const sentences = await this.executeCommand(['/ip/hotspot/active/print']);
    const users: HotspotActiveUser[] = [];

    for (const s of sentences) {
      if (s.type === '!re' && s.attributes['user'] && s.attributes['address']) {
        users.push({
          id: s.attributes['.id'] || '',
          user: s.attributes['user'],
          address: s.attributes['address'],
          macAddress: s.attributes['mac-address'] || '',
          uptime: s.attributes['uptime'],
          bytesIn: s.attributes['bytes-in'] ? parseInt(s.attributes['bytes-in'], 10) : undefined,
          bytesOut: s.attributes['bytes-out'] ? parseInt(s.attributes['bytes-out'], 10) : undefined,
        });
      }
    }

    return users;
  }

  /**
   * Fetch simple queues from /queue/simple
   */
  async getDynamicQueues(): Promise<SimpleQueueItem[]> {
    const sentences = await this.executeCommand(['/queue/simple/print']);
    const queues: SimpleQueueItem[] = [];

    for (const s of sentences) {
      if (s.type === '!re') {
        const target = s.attributes['target'] || s.attributes['target-address'] || '';
        const rateStr = s.attributes['rate'] || '0/0';
        const bytesStr = s.attributes['bytes'] || '0/0';
        const dynamic = s.attributes['dynamic'] === 'true';

        // Parse rate: "upload_bps/download_bps"
        const [txRateStr, rxRateStr] = rateStr.split('/');
        const rateTx = parseInt(txRateStr || '0', 10);
        const rateRx = parseInt(rxRateStr || '0', 10);

        // Parse bytes: "upload_bytes/download_bytes"
        const [txBytesStr, rxBytesStr] = bytesStr.split('/');
        const bytesTx = parseInt(txBytesStr || '0', 10);
        const bytesRx = parseInt(rxBytesStr || '0', 10);

        queues.push({
          id: s.attributes['.id'] || '',
          name: s.attributes['name'] || '',
          target,
          rateTx: isNaN(rateTx) ? 0 : rateTx,
          rateRx: isNaN(rateRx) ? 0 : rateRx,
          bytesTx: isNaN(bytesTx) ? 0 : bytesTx,
          bytesRx: isNaN(bytesRx) ? 0 : bytesRx,
          dynamic,
        });
      }
    }

    return queues;
  }

  /**
   * Inspect active connections for a specific user IP (/ip/firewall/connection)
   * and resolve destination IPs to actual domain/website names via Mikrotik DNS Cache.
   */
  async getUserTrafficBreakdown(userIp: string, username?: string): Promise<UserTrafficAnalysis> {
    const cleanIp = userIp.split('/')[0].trim();
    let rawSentences: RouterOSSentence[] = [];
    let dnsSentences: RouterOSSentence[] = [];

    try {
      // Concurrently fetch firewall connections and router DNS cache
      [rawSentences, dnsSentences] = await Promise.all([
        this.executeCommand(['/ip/firewall/connection/print']),
        this.executeCommand(['/ip/dns/cache/print']).catch(() => []),
      ]);
    } catch (err: any) {
      console.warn(`[MikrotikClient] Connection/DNS query error: ${err.message}`);
    }

    // Build DNS reverse lookup map: IP -> Domain Name
    const dnsMap = new Map<string, string>();
    for (const d of dnsSentences) {
      if (d.type === '!re' && d.attributes['type'] === 'A') {
        const ip = d.attributes['data'];
        const domain = d.attributes['name'];
        if (ip && domain) {
          dnsMap.set(ip, domain);
        }
      }
    }

    const sentences = rawSentences.filter(s => {
      if (s.type !== '!re') return false;
      const src = s.attributes['src-address'] || '';
      const dst = s.attributes['dst-address'] || '';
      const rdst = s.attributes['reply-dst-address'] || '';
      return src.startsWith(cleanIp + ':') || dst.startsWith(cleanIp + ':') || rdst.startsWith(cleanIp + ':');
    });

    const connections: UserConnectionDetail[] = [];
    const categoryStats = new Map<string, { count: number; services: Set<string>; totalBytes: number }>();

    const categoriesList = [
      'Streaming & Media',
      'Web & Cloud Services',
      'File Transfer & Downloads',
      'VoIP & Meetings',
      'Gaming & Apps',
      'LAN / Windows Delivery',
      'Other / Background'
    ];

    for (const cat of categoriesList) {
      categoryStats.set(cat, { count: 0, services: new Set(), totalBytes: 0 });
    }

    for (const s of sentences) {
      const protocol = s.attributes['protocol'] || 'tcp';
      const srcAddress = s.attributes['src-address'] || '';
      const dstAddress = s.attributes['dst-address'] || '';
      const origRate = parseInt(s.attributes['orig-rate'] || '0', 10);
      const replRate = parseInt(s.attributes['repl-rate'] || '0', 10);
      const origBytes = parseInt(s.attributes['orig-bytes'] || '0', 10);
      const replBytes = parseInt(s.attributes['repl-bytes'] || '0', 10);
      const state = s.attributes['tcp-state'] || s.attributes['status'] || 'established';
      const totalStreamBytes = origBytes + replBytes;

      // Extract destination IP & port from dstAddress (e.g. 142.250.185.206:443 -> IP 142.250.185.206, Port 443)
      const parts = dstAddress.split(':');
      const dstIp = parts[0] || '';
      const dstPort = parts.length > 1 ? parseInt(parts[1], 10) : 80;

      // Resolve domain name from RouterOS DNS Cache
      const cachedDomain = dnsMap.get(dstIp);

      const { category, service, domainName } = this.classifyPortAndDomain(dstPort, protocol, dstIp, cachedDomain);

      connections.push({
        id: s.attributes['.id'] || `${srcAddress}-${dstAddress}`,
        protocol,
        srcAddress,
        dstAddress,
        dstPort,
        domainName,
        serviceName: service,
        category,
        origRateBps: origRate,
        replRateBps: replRate,
        origBytes,
        replBytes,
        state,
      });

      const stat = categoryStats.get(category) || { count: 0, services: new Set(), totalBytes: 0 };
      stat.count += 1;
      stat.services.add(domainName || service);
      stat.totalBytes += totalStreamBytes;
      categoryStats.set(category, stat);
    }

    // Sort connections by highest transferred bytes first
    connections.sort((a, b) => ((b.origBytes || 0) + (b.replBytes || 0)) - ((a.origBytes || 0) + (a.replBytes || 0)));

    const totalConns = Math.max(1, connections.length);
    const categoryBreakdown: TrafficCategoryBreakdown[] = [];
    let dominantCategory = 'Web & Cloud Services';
    let maxBytes = -1;

    for (const [catName, stat] of categoryStats.entries()) {
      if (stat.count > 0) {
        const percentage = Math.round((stat.count / totalConns) * 100);
        if (stat.totalBytes > maxBytes) {
          maxBytes = stat.totalBytes;
          dominantCategory = catName;
        }

        categoryBreakdown.push({
          category: catName,
          connectionCount: stat.count,
          percentage,
          topServices: Array.from(stat.services).slice(0, 3),
          estimatedRateBps: stat.totalBytes,
        });
      }
    }

    categoryBreakdown.sort((a, b) => b.estimatedRateBps - a.estimatedRateBps);

    return {
      userIp: cleanIp,
      username,
      totalConnections: connections.length,
      dominantCategory,
      categories: categoryBreakdown,
      connections: connections.slice(0, 30), // Return top 30 active streams
      analyzedAt: Date.now(),
    };
  }

  /**
   * Helper to classify network ports and resolve exact domain names from DNS Cache
   * with friendly human-readable application explanations.
   */
  private classifyPortAndDomain(
    port: number,
    protocol: string,
    dstIp: string,
    cachedDomain?: string
  ): { category: string; service: string; domainName?: string } {
    if (cachedDomain) {
      const lower = cachedDomain.toLowerCase();

      // 1. YouTube & Google Video CDN
      if (lower.includes('googlevideo') || lower.includes('youtube')) {
        return {
          category: 'Streaming & Media',
          service: 'YouTube Video Streaming (Google Video CDN)',
          domainName: cachedDomain,
        };
      }
      // 2. TikTok
      if (lower.includes('tiktok') || lower.includes('byteoversea') || lower.includes('musical.ly') || lower.includes('ibytedtos')) {
        return {
          category: 'Streaming & Media',
          service: 'TikTok Video Stream / Feed CDN',
          domainName: cachedDomain,
        };
      }
      // 3. Instagram & Facebook Media
      if (lower.includes('fbcdn') || lower.includes('cdninstagram') || lower.includes('instagram') || lower.includes('facebook')) {
        return {
          category: 'Streaming & Media',
          service: 'Instagram / Facebook Media (Reels & Feed)',
          domainName: cachedDomain,
        };
      }
      // 4. Netflix
      if (lower.includes('netflix') || lower.includes('nflxvideo') || lower.includes('nflximg')) {
        return {
          category: 'Streaming & Media',
          service: 'Netflix HD Video Streaming',
          domainName: cachedDomain,
        };
      }
      // 5. Spotify
      if (lower.includes('spotify') || lower.includes('scdn.co') || lower.includes('audio-ak-spotify')) {
        return {
          category: 'Streaming & Media',
          service: 'Spotify Audio Streaming',
          domainName: cachedDomain,
        };
      }
      // 6. Video Meetings / VoIP
      if (lower.includes('zoom') || lower.includes('zoomgov')) {
        return {
          category: 'VoIP & Meetings',
          service: 'Zoom Video Conference',
          domainName: cachedDomain,
        };
      }
      if (lower.includes('teams.microsoft') || lower.includes('skype')) {
        return {
          category: 'VoIP & Meetings',
          service: 'Microsoft Teams / Skype Meeting',
          domainName: cachedDomain,
        };
      }
      if (lower.includes('meet.google') || lower.includes('webrtc')) {
        return {
          category: 'VoIP & Meetings',
          service: 'Google Meet / WebRTC VoIP',
          domainName: cachedDomain,
        };
      }
      if (lower.includes('discord')) {
        return {
          category: 'VoIP & Meetings',
          service: 'Discord Voice & Chat',
          domainName: cachedDomain,
        };
      }
      // 7. WhatsApp
      if (lower.includes('whatsapp')) {
        return {
          category: 'Web & Cloud Services',
          service: 'WhatsApp Calls & Media Sync',
          domainName: cachedDomain,
        };
      }
      // 8. OS Updates & App Store CDNs
      if (lower.includes('windowsupdate') || lower.includes('delivery.mp.microsoft') || lower.includes('msftconnecttest') || lower.includes('update.microsoft')) {
        return {
          category: 'File Transfer & Downloads',
          service: 'Windows Update / Microsoft CDN',
          domainName: cachedDomain,
        };
      }
      if (lower.includes('gvt1.com') || lower.includes('gvt2.com') || lower.includes('play.googleapis')) {
        return {
          category: 'File Transfer & Downloads',
          service: 'Google Play Store / App Download',
          domainName: cachedDomain,
        };
      }
      if (lower.includes('apple.com') || lower.includes('icloud.com') || lower.includes('aaplimg') || lower.includes('mzstatic')) {
        return {
          category: 'Web & Cloud Services',
          service: 'Apple iCloud / App Store Sync',
          domainName: cachedDomain,
        };
      }
      // 9. Gaming
      if (lower.includes('steampowered') || lower.includes('steamcontent') || lower.includes('steamcommunity')) {
        return {
          category: 'Gaming & Apps',
          service: 'Steam Game Download / Client',
          domainName: cachedDomain,
        };
      }
      if (lower.includes('epicgames') || lower.includes('unrealengine')) {
        return {
          category: 'Gaming & Apps',
          service: 'Epic Games Launcher / Downloads',
          domainName: cachedDomain,
        };
      }
      if (lower.includes('roblox') || lower.includes('rbxcdn')) {
        return {
          category: 'Gaming & Apps',
          service: 'Roblox Online Gaming',
          domainName: cachedDomain,
        };
      }
      if (lower.includes('garena') || lower.includes('riotgames') || lower.includes('valorant')) {
        return {
          category: 'Gaming & Apps',
          service: 'Online Gaming Server',
          domainName: cachedDomain,
        };
      }
      // 10. Developer / Cloud
      if (lower.includes('github') || lower.includes('githubusercontent')) {
        return {
          category: 'Web & Cloud Services',
          service: 'GitHub Code / Asset Hosting',
          domainName: cachedDomain,
        };
      }
      if (lower.includes('cloudflare')) {
        return {
          category: 'Web & Cloud Services',
          service: 'Cloudflare Edge CDN',
          domainName: cachedDomain,
        };
      }
      if (lower.includes('akamaized') || lower.includes('akamai')) {
        return {
          category: 'Web & Cloud Services',
          service: 'Akamai Global CDN',
          domainName: cachedDomain,
        };
      }
      if (lower.includes('fastly')) {
        return {
          category: 'Web & Cloud Services',
          service: 'Fastly Global CDN',
          domainName: cachedDomain,
        };
      }

      return {
        category: 'Web & Cloud Services',
        service: `Web (${cachedDomain})`,
        domainName: cachedDomain,
      };
    }

    // Spotify Audio Streaming
    if (port === 4070) {
      return { category: 'Streaming & Media', service: 'Spotify Audio Streaming', domainName: 'ap.spotify.com' };
    }
    // Windows Delivery Optimization / LAN P2P
    if (port === 7680) {
      return { category: 'LAN / Windows Delivery', service: 'Windows Update P2P / LAN' };
    }
    // VoIP & Video Meetings
    if (protocol === 'udp' && ((port >= 3478 && port <= 3481) || (port >= 8801 && port <= 8810) || port === 5060 || port === 5061)) {
      return { category: 'VoIP & Meetings', service: 'Zoom / Teams / Meet VoIP' };
    }
    // Web & Cloud Media by IP prefix
    if (port === 443 || port === 8443) {
      if (dstIp.startsWith('142.250.') || dstIp.startsWith('172.217.') || dstIp.startsWith('108.177.') || dstIp.startsWith('172.253.')) {
        return { category: 'Streaming & Media', service: 'YouTube / Google Media Stream', domainName: 'google.com' };
      }
      if (dstIp.startsWith('146.75.') || dstIp.startsWith('151.101.')) {
        return { category: 'Streaming & Media', service: 'Fastly Video / Media CDN', domainName: 'fastly.net' };
      }
      if (dstIp.startsWith('162.159.') || dstIp.startsWith('172.64.') || dstIp.startsWith('104.16.')) {
        return { category: 'Web & Cloud Services', service: 'Cloudflare Edge / Web', domainName: 'cloudflare.com' };
      }
      if (dstIp.startsWith('52.') || dstIp.startsWith('20.') || dstIp.startsWith('40.')) {
        return { category: 'Web & Cloud Services', service: 'Microsoft 365 / Azure Cloud', domainName: 'microsoft.com' };
      }
      return { category: 'Web & Cloud Services', service: 'HTTPS Secure Web' };
    }
    if (port === 80 || port === 8080) {
      return { category: 'Web & Cloud Services', service: 'HTTP Web Traffic' };
    }
    if (port === 1935 || port === 8000 || port === 8888 || port === 554) {
      return { category: 'Streaming & Media', service: 'Video Streaming / CDN' };
    }
    if (port === 20 || port === 21 || port === 22 || port === 8088 || (port >= 6881 && port <= 6889) || port === 51413) {
      return { category: 'File Transfer & Downloads', service: 'File Transfer / Torrent / SSH' };
    }
    if ((port >= 27015 && port <= 27030) || port === 7777 || port === 3074 || port === 9339) {
      return { category: 'Gaming & Apps', service: 'Online Gaming Session' };
    }
    if (port === 53 || port === 853) {
      return { category: 'Web & Cloud Services', service: 'DNS Name Resolution' };
    }
    return { category: 'Other / Background', service: `Port ${port}/${protocol.toUpperCase()}` };
  }

  /**
   * Fetch all hotspot hosts (/ip/hotspot/host) to identify unauthenticated devices
   */
  async getHotspotHosts(): Promise<HotspotHostItem[]> {
    const sentences = await this.executeCommand(['/ip/hotspot/host/print']);
    const hosts: HotspotHostItem[] = [];
    const now = Date.now();

    for (const s of sentences) {
      if (s.type === '!re' && (s.attributes['mac-address'] || s.attributes['address'])) {
        const authorized = s.attributes['authorized'] === 'true';
        const bypassed = s.attributes['bypassed'] === 'true';

        hosts.push({
          id: s.attributes['.id'] || '',
          macAddress: s.attributes['mac-address'] || '',
          ipAddress: s.attributes['address'] || '',
          server: s.attributes['server'] || '',
          authorized,
          bypassed,
          bytesIn: parseInt(s.attributes['bytes-in'] || '0', 10),
          bytesOut: parseInt(s.attributes['bytes-out'] || '0', 10),
          packetsIn: parseInt(s.attributes['packets-in'] || '0', 10),
          packetsOut: parseInt(s.attributes['packets-out'] || '0', 10),
          uptime: s.attributes['uptime'],
          idleTime: s.attributes['idle-time'],
          comment: s.attributes['comment'],
          seenAt: now,
        });
      }
    }

    return hosts;
  }

  /**
   * Fetch security and authentication audit logs (/log/print)
   */
  async getSecurityLogs(): Promise<SecurityLogItem[]> {
    const sentences = await this.executeCommand(['/log/print']);
    const logs: SecurityLogItem[] = [];
    const now = Date.now();

    for (const s of sentences) {
      if (s.type === '!re' && s.attributes['message']) {
        const message = s.attributes['message'];
        const topicsStr = s.attributes['topics'] || '';
        const topics = topicsStr.split(',').map(t => t.trim());
        const timeStr = s.attributes['time'] || '';

        // Check if log is relevant to hotspot authentication or access attempts
        const isHotspot = topics.some(t => t.includes('hotspot'));
        const isAccount = topics.some(t => t.includes('account') || t.includes('system'));
        const isWarning = topics.some(t => t.includes('warning') || t.includes('error') || t.includes('critical'));

        if (isHotspot || isAccount || isWarning || message.toLowerCase().includes('login') || message.toLowerCase().includes('failed')) {
          let severity: 'warning' | 'error' | 'info' = 'info';
          let logType: SecurityLogItem['type'] = 'other';

          const msgLower = message.toLowerCase();

          if (msgLower.includes('failed') || msgLower.includes('invalid password') || msgLower.includes('invalid user')) {
            severity = 'error';
            logType = 'hotspot_login_failed';
          } else if (msgLower.includes('already logged in') || msgLower.includes('too many') || msgLower.includes('session limit')) {
            severity = 'warning';
            logType = 'user_duplicate';
          } else if (msgLower.includes('logged in') || msgLower.includes('login ok')) {
            severity = 'info';
            logType = 'hotspot_login_success';
          } else if (msgLower.includes('auth') || msgLower.includes('denied')) {
            severity = 'error';
            logType = 'router_auth_failed';
          }

          // Extract username and IP with regex if present
          // Pattern: "user <username> (192.168.41.x): ..."
          const userMatch = message.match(/user\s+([^\s\(\)]+)/i);
          const ipMatch = message.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
          const macMatch = message.match(/([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})/);

          logs.push({
            id: s.attributes['.id'] || `${timeStr}-${logs.length}`,
            time: timeStr,
            timestamp: now,
            topics,
            message,
            severity,
            type: logType,
            targetUser: userMatch ? userMatch[1] : undefined,
            targetIp: ipMatch ? ipMatch[1] : undefined,
            targetMac: macMatch ? macMatch[0] : undefined,
          });
        }
      }
    }

    return logs.reverse().slice(0, 100); // Return most recent 100 logs
  }

  /**
   * Monitor live traffic directly on the physical WAN interface (/interface/monitor-traffic)
   */
  async getWanTraffic(iface = 'ether11'): Promise<WanInterfaceSample> {
    const now = Date.now();
    try {
      const sentences = await this.executeCommand([
        '/interface/monitor-traffic',
        `=interface=${iface}`,
        '=once='
      ]);

      const data = sentences.find(s => s.type === '!re')?.attributes || {};

      return {
        interfaceName: iface,
        rxRateBps: parseInt(data['rx-bits-per-second'] || '0', 10),
        txRateBps: parseInt(data['tx-bits-per-second'] || '0', 10),
        rxPacketsPerSec: parseInt(data['rx-packets-per-second'] || '0', 10),
        txPacketsPerSec: parseInt(data['tx-packets-per-second'] || '0', 10),
        dropsPerSec: parseInt(data['tx-queue-drops-per-second'] || '0', 10),
        lastCheckedAt: now,
      };
    } catch (err: any) {
      return {
        interfaceName: iface,
        rxRateBps: 0,
        txRateBps: 0,
        rxPacketsPerSec: 0,
        txPacketsPerSec: 0,
        dropsPerSec: 0,
        lastCheckedAt: now,
      };
    }
  }

  /**
   * Aggregate active WAN/LAN connections across the entire router to determine
   * real-time bandwidth drain per destination application (YouTube, TikTok, Instagram, Zoom, etc.)
   */
  async getLiveTrafficDestinations(totalWanBps = 0): Promise<LiveTrafficDestination[]> {
    try {
      const [rawConns, dnsCache] = await Promise.all([
        this.executeCommand(['/ip/firewall/connection/print']).catch(() => []),
        this.executeCommand(['/ip/dns/cache/print']).catch(() => []),
      ]);

      const dnsMap = new Map<string, string>();
      for (const d of dnsCache) {
        if (d.type === '!re' && d.attributes['type'] === 'A') {
          const ip = d.attributes['data'];
          const domain = d.attributes['name'];
          if (ip && domain) {
            dnsMap.set(ip, domain);
          }
        }
      }

      interface GroupedDest {
        id: string;
        name: string;
        category: string;
        badge: string;
        explanation: string;
        appIconKey: string;
        downloadRateBps: number;
        uploadRateBps: number;
        activeStreamsCount: number;
        sampleDomain?: string;
      }

      const groups = new Map<string, GroupedDest>();

      const getAppMeta = (domain?: string, service?: string, port = 80) => {
        const d = (domain || '').toLowerCase();
        const s = (service || '').toLowerCase();

        if (d.includes('googlevideo') || d.includes('youtube')) {
          return {
            id: 'youtube',
            name: 'YouTube Video Stream',
            category: 'Streaming & Media',
            badge: 'Google Video CDN',
            explanation: 'Streaming video buffer / playback chunk',
            appIconKey: 'youtube',
          };
        }
        if (d.includes('fbcdn') || d.includes('cdninstagram') || d.includes('instagram') || d.includes('facebook')) {
          return {
            id: 'meta',
            name: 'Instagram / Facebook Media',
            category: 'Streaming & Media',
            badge: 'Meta Media CDN',
            explanation: 'Reels, Stories, and photo feed transfer',
            appIconKey: 'meta',
          };
        }
        if (d.includes('tiktok') || d.includes('byteoversea') || d.includes('ibytedtos')) {
          return {
            id: 'tiktok',
            name: 'TikTok Video Stream',
            category: 'Streaming & Media',
            badge: 'ByteDance CDN',
            explanation: 'Short-form video stream & Live data',
            appIconKey: 'tiktok',
          };
        }
        if (d.includes('netflix') || d.includes('nflxvideo')) {
          return {
            id: 'netflix',
            name: 'Netflix Video Stream',
            category: 'Streaming & Media',
            badge: 'Netflix Open Connect',
            explanation: 'High-definition video streaming buffer',
            appIconKey: 'netflix',
          };
        }
        if (d.includes('spotify') || d.includes('audio-ak-spotify') || port === 4070) {
          return {
            id: 'spotify',
            name: 'Spotify Audio Streaming',
            category: 'Streaming & Media',
            badge: 'Spotify Music CDN',
            explanation: 'High-bitrate music playback stream',
            appIconKey: 'spotify',
          };
        }
        if (d.includes('zoom') || d.includes('zoomgov')) {
          return {
            id: 'zoom',
            name: 'Zoom Video Conference',
            category: 'VoIP & Meetings',
            badge: 'Zoom VoIP',
            explanation: 'Real-time video/audio meeting stream',
            appIconKey: 'zoom',
          };
        }
        if (d.includes('teams.microsoft') || d.includes('skype')) {
          return {
            id: 'teams',
            name: 'Microsoft Teams Meeting',
            category: 'VoIP & Meetings',
            badge: 'Teams VoIP',
            explanation: 'Conference call & collaboration stream',
            appIconKey: 'teams',
          };
        }
        if (d.includes('meet.google') || d.includes('webrtc')) {
          return {
            id: 'google_meet',
            name: 'Google Meet / WebRTC',
            category: 'VoIP & Meetings',
            badge: 'Google VoIP',
            explanation: 'Real-time video/audio communication',
            appIconKey: 'google',
          };
        }
        if (d.includes('whatsapp')) {
          return {
            id: 'whatsapp',
            name: 'WhatsApp Call & Media Sync',
            category: 'Web & Cloud Services',
            badge: 'WhatsApp Media',
            explanation: 'Voice/video call or document download',
            appIconKey: 'whatsapp',
          };
        }
        if (d.includes('windowsupdate') || d.includes('delivery.mp.microsoft') || d.includes('update.microsoft') || port === 7680) {
          return {
            id: 'windows_update',
            name: 'Windows Update / Microsoft OS',
            category: 'File Transfer & Downloads',
            badge: 'Microsoft CDN',
            explanation: 'Operating system background patch download',
            appIconKey: 'windows',
          };
        }
        if (d.includes('gvt1.com') || d.includes('gvt2.com') || d.includes('play.googleapis')) {
          return {
            id: 'google_play',
            name: 'Google Play Store Updates',
            category: 'File Transfer & Downloads',
            badge: 'Google App Delivery',
            explanation: 'Android application downloads & updates',
            appIconKey: 'google',
          };
        }
        if (d.includes('apple.com') || d.includes('icloud.com') || d.includes('aaplimg')) {
          return {
            id: 'apple',
            name: 'Apple iCloud & App Store',
            category: 'Web & Cloud Services',
            badge: 'Apple CDN',
            explanation: 'iOS / macOS apps & iCloud sync',
            appIconKey: 'apple',
          };
        }
        if (d.includes('steampowered') || d.includes('steamcontent') || d.includes('epicgames') || d.includes('roblox')) {
          return {
            id: 'gaming',
            name: 'Online Gaming & Game Updates',
            category: 'Gaming & Apps',
            badge: 'Game Delivery CDN',
            explanation: 'Multiplayer gaming sessions & asset downloads',
            appIconKey: 'gaming',
          };
        }
        if (d.includes('cloudflare') || d.includes('akamaized') || d.includes('fastly')) {
          return {
            id: 'cdn_edge',
            name: 'Edge CDN Acceleration',
            category: 'Web & Cloud Services',
            badge: 'Global Edge CDN',
            explanation: 'Encrypted CDN accelerated web assets',
            appIconKey: 'cloud',
          };
        }

        return {
          id: 'web_general',
          name: 'General Web & Cloud Traffic',
          category: 'Web & Cloud Services',
          badge: 'HTTPS / Cloud',
          explanation: 'Standard web browsing, APIs, and cloud services',
          appIconKey: 'web',
        };
      };

      for (const s of rawConns) {
        if (s.type !== '!re') continue;
        const dstAddress = s.attributes['dst-address'] || '';
        const origRate = parseInt(s.attributes['orig-rate'] || '0', 10);
        const replRate = parseInt(s.attributes['repl-rate'] || '0', 10);
        const origBytes = parseInt(s.attributes['orig-bytes'] || '0', 10);
        const replBytes = parseInt(s.attributes['repl-bytes'] || '0', 10);

        const parts = dstAddress.split(':');
        const dstIp = parts[0] || '';
        const dstPort = parts.length > 1 ? parseInt(parts[1], 10) : 80;

        const cachedDomain = dnsMap.get(dstIp);
        const { category, service, domainName } = this.classifyPortAndDomain(dstPort, s.attributes['protocol'] || 'tcp', dstIp, cachedDomain);
        const meta = getAppMeta(domainName, service, dstPort);

        const dlRate = replRate > 0 ? replRate : Math.round((replBytes / Math.max(1, (origBytes + replBytes))) * 50000);
        const ulRate = origRate > 0 ? origRate : Math.round((origBytes / Math.max(1, (origBytes + replBytes))) * 10000);

        const existing = groups.get(meta.id) || {
          ...meta,
          downloadRateBps: 0,
          uploadRateBps: 0,
          activeStreamsCount: 0,
          sampleDomain: domainName || cachedDomain,
        };

        existing.downloadRateBps += dlRate;
        existing.uploadRateBps += ulRate;
        existing.activeStreamsCount += 1;
        if (!existing.sampleDomain && domainName) {
          existing.sampleDomain = domainName;
        }
        groups.set(meta.id, existing);
      }

      const totalTraffic = Math.max(1, totalWanBps, Array.from(groups.values()).reduce((acc, g) => acc + g.downloadRateBps + g.uploadRateBps, 0));

      const result: LiveTrafficDestination[] = Array.from(groups.values()).map(g => {
        const totalRateBps = g.downloadRateBps + g.uploadRateBps;
        return {
          id: g.id,
          name: g.name,
          category: g.category,
          badge: g.badge,
          explanation: g.explanation,
          appIconKey: g.appIconKey,
          downloadRateBps: g.downloadRateBps,
          uploadRateBps: g.uploadRateBps,
          totalRateBps,
          percentageOfWan: Math.min(100, Math.round((totalRateBps / totalTraffic) * 100)),
          activeStreamsCount: g.activeStreamsCount,
          sampleDomain: g.sampleDomain,
        };
      });

      result.sort((a, b) => b.totalRateBps - a.totalRateBps);
      return result.slice(0, 8);
    } catch {
      return [];
    }
  }
}


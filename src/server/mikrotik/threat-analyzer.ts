import { resolveGeoIp, classifyAttackPort } from './geoip.js';
import type { AttackEvent, ThreatMapSummary } from '../types.js';

// ==========================================
// Mikrotik Threat & Attack Map Engine
// ==========================================

export class ThreatAnalyzer {
  private static attackHistory: AttackEvent[] = [];

  /**
   * Process RouterOS logs to extract REAL firewall drops and port scan attacks
   */
  static processLogs(logs: any[], isMock = false): ThreatMapSummary {
    const now = Date.now();
    const parsedAttacks: AttackEvent[] = [];

    for (const log of logs) {
      const message = log.attributes ? log.attributes['message'] || '' : log.message || '';
      const timeStr = log.attributes ? log.attributes['time'] || '' : log.time || '';
      const msgLower = message.toLowerCase();

      // Check if this is a firewall block or drop log
      if (
        msgLower.includes('blocked') ||
        msgLower.includes('wan_attack') ||
        msgLower.includes('portscan') ||
        msgLower.includes('drop') ||
        msgLower.includes('input-blocked')
      ) {
        // Regex pattern: "proto TCP (SYN), 80.251.153.178:38770->192.168.18.207:23"
        const connMatch = message.match(/(?:proto\s+([A-Za-z0-9]+))?.*?(\d{1,3}(?:\.\d{1,3}){3})(?::(\d+))?->(\d{1,3}(?:\.\d{1,3}){3})(?::(\d+))?/i);

        if (connMatch) {
          const protoStr = (connMatch[1] || 'TCP').toUpperCase();
          const srcIp = connMatch[2];
          const targetPort = parseInt(connMatch[5] || '8291', 10);
          const protocol: 'TCP' | 'UDP' | 'ICMP' = protoStr === 'UDP' ? 'UDP' : protoStr === 'ICMP' ? 'ICMP' : 'TCP';

          // Filter out private internal LAN IPs so map only plots real external attacks
          const isInternal =
            srcIp.startsWith('192.168.') ||
            srcIp.startsWith('10.') ||
            srcIp.startsWith('172.16.') ||
            srcIp.startsWith('172.17.') ||
            srcIp.startsWith('172.18.') ||
            srcIp.startsWith('172.19.') ||
            srcIp.startsWith('172.20.') ||
            srcIp.startsWith('172.31.') ||
            srcIp === '127.0.0.1' ||
            srcIp === '0.0.0.0';

          if (!isInternal) {
            const geo = resolveGeoIp(srcIp);
            const portInfo = classifyAttackPort(targetPort);

            parsedAttacks.push({
              id: `real-atk-${srcIp}-${targetPort}-${timeStr || parsedAttacks.length}`,
              timestamp: now,
              timeStr: timeStr || new Date().toLocaleTimeString('id-ID'),
              sourceIp: srcIp,
              countryCode: geo.countryCode,
              countryName: geo.countryName,
              city: geo.city,
              lat: geo.lat,
              lng: geo.lng,
              targetPort: targetPort,
              targetService: portInfo.service,
              protocol,
              flagEmoji: geo.flagEmoji,
              action: 'blocked',
              rawMessage: message,
            });
          }
        }
      }
    }

    // Merge unique real attacks
    if (parsedAttacks.length > 0) {
      const existingIds = new Set(this.attackHistory.map(a => `${a.sourceIp}:${a.targetPort}`));
      for (const atk of parsedAttacks) {
        if (!existingIds.has(`${atk.sourceIp}:${atk.targetPort}`)) {
          this.attackHistory.unshift(atk);
          existingIds.add(`${atk.sourceIp}:${atk.targetPort}`);
        }
      }
      this.attackHistory = this.attackHistory.slice(0, 100);
    }

    // Only inject simulation if in MOCK mode and there are zero attacks
    if (isMock && this.attackHistory.length === 0) {
      this.injectMockAttacks();
    }

    // Aggregate Top Countries
    const countryMap = new Map<string, { name: string; count: number; flag: string }>();
    const portMap = new Map<number, { service: string; count: number }>();

    for (const atk of this.attackHistory) {
      // Countries
      const currentC = countryMap.get(atk.countryCode) || { name: atk.countryName, count: 0, flag: atk.flagEmoji };
      currentC.count += 1;
      countryMap.set(atk.countryCode, currentC);

      // Ports
      const currentP = portMap.get(atk.targetPort) || { service: atk.targetService, count: 0 };
      currentP.count += 1;
      portMap.set(atk.targetPort, currentP);
    }

    const totalAttacks = Math.max(1, this.attackHistory.length);

    const topCountries = Array.from(countryMap.entries())
      .map(([code, data]) => ({
        countryCode: code,
        countryName: data.name,
        count: data.count,
        percentage: Math.round((data.count / totalAttacks) * 100),
        flagEmoji: data.flag,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const topTargetPorts = Array.from(portMap.entries())
      .map(([port, data]) => ({
        port,
        service: data.service,
        count: data.count,
        percentage: Math.round((data.count / totalAttacks) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalAttacks24h: Math.max(this.attackHistory.length, parsedAttacks.length),
      activeAttacks: this.attackHistory.slice(0, 30),
      topCountries,
      topTargetPorts,
      officeLocation: {
        name: 'Gateway Router (Jakarta, ID)',
        lat: -6.2088,
        lng: 106.8456,
      },
      lastUpdated: now,
    };
  }

  private static injectMockAttacks() {
    const sampleAttackers = [
      { ip: '185.220.101.5', code: 'NL', port: 8291, proto: 'TCP' },
      { ip: '114.119.130.44', code: 'CN', port: 22, proto: 'TCP' },
      { ip: '45.154.255.89', code: 'RU', port: 8728, proto: 'TCP' },
      { ip: '198.235.24.11', code: 'US', port: 80, proto: 'TCP' },
      { ip: '177.54.128.9', code: 'BR', port: 3389, proto: 'TCP' },
    ];

    const now = Date.now();
    for (let i = 0; i < sampleAttackers.length; i++) {
      const s = sampleAttackers[i];
      const geo = resolveGeoIp(s.ip);
      const portInfo = classifyAttackPort(s.port);

      this.attackHistory.push({
        id: `mock-atk-${i}`,
        timestamp: now - i * 4000,
        timeStr: new Date(now - i * 4000).toLocaleTimeString('id-ID'),
        sourceIp: s.ip,
        countryCode: geo.countryCode,
        countryName: geo.countryName,
        city: geo.city,
        lat: geo.lat,
        lng: geo.lng,
        targetPort: s.port,
        targetService: portInfo.service,
        protocol: s.proto as 'TCP' | 'UDP',
        flagEmoji: geo.flagEmoji,
        action: 'blocked',
        rawMessage: `[MOCK_ATTACK] ${s.ip}->WAN:${s.port}`,
      });
    }
  }
}

// ==========================================
// REST API Client
// ==========================================

export async function fetchActiveUsers() {
  const res = await fetch('/api/users/active');
  if (!res.ok) throw new Error(`Failed to fetch active users: ${res.statusText}`);
  return res.json();
}

export async function fetchUserHistory(username: string, range = '1h') {
  const res = await fetch(`/api/history/${encodeURIComponent(username)}?range=${encodeURIComponent(range)}`);
  if (!res.ok) throw new Error(`Failed to fetch user history: ${res.statusText}`);
  return res.json();
}

export async function fetchAggregateHistory(range = '1h') {
  const res = await fetch(`/api/aggregate?range=${encodeURIComponent(range)}`);
  if (!res.ok) throw new Error(`Failed to fetch aggregate history: ${res.statusText}`);
  return res.json();
}

export async function fetchSystemStatus() {
  const res = await fetch('/api/status');
  if (!res.ok) throw new Error(`Failed to fetch system status: ${res.statusText}`);
  return res.json();
}

export async function fetchUserTrafficBreakdown(ip: string, username?: string) {
  const query = username ? `?username=${encodeURIComponent(username)}` : '';
  const res = await fetch(`/api/users/${encodeURIComponent(ip)}/traffic-breakdown${query}`);
  if (!res.ok) throw new Error(`Failed to fetch traffic breakdown for ${ip}: ${res.statusText}`);
  return res.json();
}

export async function fetchSecuritySummary() {
  const res = await fetch('/api/security/summary');
  if (!res.ok) throw new Error(`Failed to fetch security summary: ${res.statusText}`);
  return res.json();
}

export async function fetchSecurityHosts() {
  const res = await fetch('/api/security/hosts');
  if (!res.ok) throw new Error(`Failed to fetch security hosts: ${res.statusText}`);
  return res.json();
}

export async function fetchSecurityLogs() {
  const res = await fetch('/api/security/logs');
  if (!res.ok) throw new Error(`Failed to fetch security logs: ${res.statusText}`);
  return res.json();
}

export async function runSpeedTest(): Promise<{ success: boolean; result: any }> {
  const res = await fetch('/api/speedtest/run', { method: 'POST' });
  if (!res.ok) throw new Error(`Speed test failed: ${res.statusText}`);
  return res.json();
}

export async function fetchSpeedTestHistory(): Promise<{ success: boolean; history: any[]; latest?: any }> {
  const res = await fetch('/api/speedtest/history');
  if (!res.ok) throw new Error(`Failed to fetch speed test history: ${res.statusText}`);
  return res.json();
}

export async function fetchWanLive(): Promise<{ success: boolean; wan: any }> {
  const res = await fetch('/api/speedtest/wan-live');
  if (!res.ok) throw new Error(`Failed to fetch WAN traffic: ${res.statusText}`);
  return res.json();
}

export async function fetchConfig(): Promise<{ success: boolean; capacityMbps: number; settings: Record<string, string>; envDefaults: any }> {
  const res = await fetch('/api/config');
  if (!res.ok) throw new Error(`Failed to fetch config: ${res.statusText}`);
  return res.json();
}

export async function updateConfig(payload: { capacityMbps?: number; routerLabel?: string; customSettings?: Record<string, string> }): Promise<{ success: boolean; capacityMbps: number; settings: Record<string, string>; message: string }> {
  const res = await fetch('/api/config', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to update config: ${res.statusText}`);
  return res.json();
}

export async function fetchIspHealth() {
  const res = await fetch('/api/isp/health');
  if (!res.ok) throw new Error(`Failed to fetch ISP health: ${res.statusText}`);
  return res.json();
}

export async function refreshIspHealth() {
  const res = await fetch('/api/isp/health/refresh', { method: 'POST' });
  if (!res.ok) throw new Error(`Failed to refresh ISP health: ${res.statusText}`);
  return res.json();
}




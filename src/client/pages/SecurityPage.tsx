import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, ShieldCheck, UserX, Wifi, AlertTriangle, RefreshCw, Clock, Terminal, Laptop, UserCheck, Globe, Zap, Crosshair } from 'lucide-react';
import { fetchSecuritySummary } from '../lib/api.js';
import { formatBytes, formatDateTime, cleanUptime } from '../lib/format.js';
import { ThreatMap } from '../components/ThreatMap.js';
import type { SecuritySummary, HotspotHostItem, SecurityLogItem } from '../../server/types.js';

export const SecurityPage: React.FC = () => {
  const [summary, setSummary] = useState<SecuritySummary | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'threat-map' | 'hosts' | 'logs'>('threat-map');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchFilter, setSearchFilter] = useState<string>('');

  const loadData = () => {
    setIsLoading(true);
    fetchSecuritySummary()
      .then((res) => {
        if (res.success && res.summary) {
          setSummary(res.summary);
        }
      })
      .catch((err) => {
        console.error('Failed to load security summary:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 8000);
    return () => clearInterval(timer);
  }, []);

  const unauthorizedHosts = summary?.unauthorizedHosts || [];
  const logs = summary?.recentLogs || [];

  const filteredHosts = unauthorizedHosts.filter((h) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase().trim();
    return (
      h.macAddress.toLowerCase().includes(q) ||
      h.ipAddress.includes(q) ||
      (h.comment && h.comment.toLowerCase().includes(q))
    );
  });

  const filteredLogs = logs.filter((l) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase().trim();
    return (
      l.message.toLowerCase().includes(q) ||
      (l.targetUser && l.targetUser.toLowerCase().includes(q)) ||
      (l.targetIp && l.targetIp.includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <span>Security Command Center & Threat Intelligence</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live cyber threat radar map, captive portal host detection, and RouterOS authentication audit logs
            </p>
          </div>
        </div>

        <button
          onClick={loadData}
          disabled={isLoading}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-all self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Sub Navigation Bar */}
      <div className="flex items-center space-x-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 w-fit">
        <button
          onClick={() => setActiveSubTab('threat-map')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'threat-map'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Live Threat Map</span>
        </button>

        <button
          onClick={() => setActiveSubTab('hosts')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'hosts'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Laptop className="w-4 h-4" />
          <span>Captive Portal Hosts ({unauthorizedHosts.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('logs')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'logs'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Auth & Audit Logs ({logs.length})</span>
        </button>
      </div>

      {/* View 1: Flagship Live Threat Map */}
      {activeSubTab === 'threat-map' && (
        <ThreatMap threatMap={summary?.threatMap} onRefresh={loadData} />
      )}

      {/* View 2: Unauthorized Captive Portal Hosts */}
      {activeSubTab === 'hosts' && (
        <div className="space-y-4">
          <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/40">
            <div>
              <h3 className="text-sm font-bold text-white">
                Unauthenticated WiFi Hosts (/ip/hotspot/host)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Devices associated with access points and assigned DHCP leases that haven't authenticated
              </p>
            </div>

            <div className="w-full sm:w-64">
              <input
                type="text"
                placeholder="Filter IP, MAC, or comment..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono-num"
              />
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">MAC Address & Hostname</th>
                    <th className="py-3 px-4">IP Address (DHCP)</th>
                    <th className="py-3 px-4">Authorization State</th>
                    <th className="py-3 px-4">Pre-Auth Activity</th>
                    <th className="py-3 px-4">Session Duration</th>
                    <th className="py-3 px-4">Server / Profile</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredHosts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <ShieldCheck className="w-8 h-8 text-emerald-500" />
                          <p className="text-sm font-medium text-slate-300">
                            No unauthenticated captive portal hosts detected
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredHosts.map((host) => (
                      <tr key={host.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white font-mono-num">{host.macAddress}</div>
                          {host.comment && (
                            <div className="text-[11px] text-slate-400 font-mono-num mt-0.5">
                              {host.comment}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono-num text-slate-200">
                          {host.ipAddress}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Captive Portal (Unauthenticated)</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono-num text-slate-300">
                          <div>In: {formatBytes(host.bytesIn).full} ({host.packetsIn} pkt)</div>
                          <div className="text-[11px] text-slate-400">Out: {formatBytes(host.bytesOut).full}</div>
                        </td>
                        <td className="py-3 px-4 font-mono-num text-slate-400">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>{cleanUptime(host.uptime)}</span>
                          </div>
                          {host.idleTime && (
                            <div className="text-[11px] text-slate-500">Idle: {cleanUptime(host.idleTime)}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono-num text-slate-400">
                          {host.server || 'hotspot1'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* View 3: Login Attempt Logs */}
      {activeSubTab === 'logs' && (
        <div className="space-y-4">
          <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/40">
            <div>
              <h3 className="text-sm font-bold text-white">
                RouterOS Authentication & Access Logs (/log)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Hotspot authentication attempts, password failures, multi-session limits, and system security events
              </p>
            </div>

            <div className="w-full sm:w-64">
              <input
                type="text"
                placeholder="Filter log, user, IP..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono-num"
              />
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 w-28">Time</th>
                    <th className="py-3 px-4 w-44">Event Type</th>
                    <th className="py-3 px-4 w-44">Target User / IP</th>
                    <th className="py-3 px-4">RouterOS Log Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-500">
                        No authentication logs found
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const isError = log.severity === 'error';
                      const isWarning = log.severity === 'warning';

                      return (
                        <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-mono-num text-slate-400 text-[11px]">
                            {log.time}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                isError
                                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                  : isWarning
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              }`}
                            >
                              {isError && <AlertTriangle className="w-3 h-3" />}
                              {isWarning && <AlertTriangle className="w-3 h-3" />}
                              {!isError && !isWarning && <UserCheck className="w-3 h-3" />}
                              <span>
                                {log.type === 'hotspot_login_failed'
                                  ? 'Login Failed'
                                  : log.type === 'user_duplicate'
                                  ? 'Duplicate Session'
                                  : log.type === 'hotspot_login_success'
                                  ? 'Login Success'
                                  : log.type === 'router_auth_failed'
                                  ? 'Access Denied'
                                  : 'Log Event'}
                              </span>
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono-num">
                            {log.targetUser && (
                              <div className="font-bold text-white">{log.targetUser}</div>
                            )}
                            {log.targetIp && (
                              <div className="text-[11px] text-slate-400">{log.targetIp}</div>
                            )}
                            {!log.targetUser && !log.targetIp && (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono-num text-slate-300">
                            {log.message}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

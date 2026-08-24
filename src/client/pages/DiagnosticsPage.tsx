import React, { useState, useEffect } from 'react';
import { fetchSystemStatus } from '../lib/api.js';
import { formatBytes } from '../lib/format.js';
import { Server, Database, Router, ShieldAlert, CheckCircle2, RefreshCw, Cpu } from 'lucide-react';
import type { SystemStatus } from '../../server/types.js';

export const DiagnosticsPage: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const loadStatus = () => {
    setIsLoading(true);
    fetchSystemStatus()
      .then((res) => {
        if (res.success) {
          setStatus(res);
        }
      })
      .catch((err) => console.error('Failed to load status:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
  };

  return (
    <div className="space-y-6">
      {/* Header & Refresh */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <Server className="w-5 h-5 text-blue-400" />
            <span>Diagnostics & System Health</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Mikrotik RouterOS API connection status, SQLite telemetry engine, and runtime resources
          </p>
        </div>

        <button
          onClick={loadStatus}
          disabled={isLoading}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Grid of Diagnostic Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Mikrotik Router Status */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Router className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-bold text-white">Mikrotik RouterOS API</h3>
            </div>
            {status?.router.connected ? (
              <span className="flex items-center space-x-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Connected</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Disconnected</span>
              </span>
            )}
          </div>

          <div className="space-y-2 text-xs font-mono-num">
            <div className="flex justify-between py-1 border-b border-slate-800/40">
              <span className="text-slate-400">Target Router:</span>
              <span className="text-slate-200 font-bold">{status?.router.host}:{status?.router.port}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/40">
              <span className="text-slate-400">Polling Interval:</span>
              <span className="text-slate-200">{status?.router.pollIntervalMs} ms (5 seconds)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/40">
              <span className="text-slate-400">Simulation (Mock) Mode:</span>
              <span className={status?.router.mockMode ? 'text-amber-400 font-bold' : 'text-slate-300'}>
                {status?.router.mockMode ? 'ENABLED' : 'DISABLED (Live Router)'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Connected Hotspot Users:</span>
              <span className="text-blue-400 font-bold">{status?.router.activeUsersCount ?? 0} devices</span>
            </div>
          </div>

          {status?.router.lastError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              <p className="font-bold">Last Error:</p>
              <p className="font-mono text-[11px] mt-0.5">{status.router.lastError}</p>
            </div>
          )}
        </div>

        {/* SQLite Database & Storage Status */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Database className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">SQLite Database (WAL Mode)</h3>
            </div>
            <span className="text-xs font-mono-num px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
              {formatBytes(status?.database.sizeBytes).full}
            </span>
          </div>

          <div className="space-y-2 text-xs font-mono-num">
            <div className="flex justify-between py-1 border-b border-slate-800/40">
              <span className="text-slate-400">Raw Samples (48-Hour Retention):</span>
              <span className="text-slate-200 font-bold">{status?.database.rawSamplesCount.toLocaleString()} rows</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/40">
              <span className="text-slate-400">Hourly Aggregates (90-Day Retention):</span>
              <span className="text-slate-200 font-bold">{status?.database.hourlyAggregatesCount.toLocaleString()} rows</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/40">
              <span className="text-slate-400">Daily Aggregates (Permanent):</span>
              <span className="text-slate-200 font-bold">{status?.database.dailyAggregatesCount.toLocaleString()} rows</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Automated Partition Purge:</span>
              <span className="text-emerald-400 font-semibold">Active (Every :30 min)</span>
            </div>
          </div>
        </div>
      </div>

      {/* App Runtime & System Resources */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3 mb-4">
          <Cpu className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-bold text-white">Runtime & Server Resources</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono-num">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <p className="text-slate-400 text-[10px] uppercase">Service Uptime</p>
            <p className="text-sm font-bold text-white mt-1">
              {formatUptime(status?.app.uptimeSeconds ?? 0)}
            </p>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <p className="text-slate-400 text-[10px] uppercase">RAM Heap Usage</p>
            <p className="text-sm font-bold text-indigo-400 mt-1">
              {status?.app.memoryMb ?? 0} MB
            </p>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <p className="text-slate-400 text-[10px] uppercase">Configured Capacity</p>
            <p className="text-sm font-bold text-emerald-400 mt-1">
              {status?.network.capacityMbps ?? 200} Mbps
            </p>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <p className="text-slate-400 text-[10px] uppercase">Deployment Environment</p>
            <p className="text-sm font-bold text-slate-200 mt-1">
              Docker Container (Node.js 22)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

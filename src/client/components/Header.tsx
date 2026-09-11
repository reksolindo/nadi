import React from 'react';
import { Activity, Wifi, BarChart3, LineChart, Server, AlertCircle, ShieldAlert, Sliders, Radio, AlertTriangle } from 'lucide-react';
import { formatTimeOnly } from '../lib/format.js';
import type { IspHealthStatus } from '../../server/types.js';

interface HeaderProps {
  currentTab: 'live' | 'history' | 'aggregate' | 'security' | 'diagnostics';
  onSelectTab: (tab: 'live' | 'history' | 'aggregate' | 'security' | 'diagnostics') => void;
  wsConnected: boolean;
  routerConnected: boolean;
  routerError?: string | null;
  lastUpdated: number | null;
  capacityMbps: number;
  ispHealth?: IspHealthStatus;
  onOpenSpeedTest?: () => void;
  onOpenSettings?: () => void;
  onOpenIspHealth?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  wsConnected,
  routerConnected,
  routerError,
  lastUpdated,
  capacityMbps,
  ispHealth,
  onOpenSpeedTest,
  onOpenSettings,
  onOpenIspHealth,
}) => {
  const isIspDegraded = (ispHealth?.packetLossPercent || 0) >= 5 || (ispHealth?.latencyMs || 0) >= 70;
  const isIspCritical = (ispHealth?.packetLossPercent || 0) >= 15 || (ispHealth?.latencyMs || 0) >= 120;

  return (
    <>
      <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 transition-all">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Brand & Logo */}
            <div className="flex items-center space-x-2.5 sm:space-x-3">
              <div className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-lg shadow-blue-500/20 text-white font-bold flex-shrink-0">
                <Activity className="w-5 h-5 animate-pulse" />
                {wsConnected && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg sm:text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                    NADI
                  </span>

                  {/* ISP Health Status / SLA Button */}
                  {isIspCritical ? (
                    <button
                      type="button"
                      onClick={onOpenIspHealth}
                      title="PERINGATAN KRITIS: Terjadi packet loss parah ke upstream ISP! Klik untuk melihat bukti telemetri & salin komplain"
                      className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 transition-all flex items-center space-x-1.5 cursor-pointer animate-pulse shadow-md shadow-rose-500/20"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                      <span>⚠️ {ispHealth?.packetLossPercent}% Loss • {ispHealth?.latencyMs}ms</span>
                    </button>
                  ) : isIspDegraded ? (
                    <button
                      type="button"
                      onClick={onOpenIspHealth}
                      title="Degradasi ISP: Latensi atau packet loss meningkat. Klik untuk detail"
                      className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-all flex items-center space-x-1.5 cursor-pointer"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      <span>⚠️ SLA Degraded • {ispHealth?.latencyMs}ms</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onOpenIspHealth}
                      title="ISP SLA Normal: Klik untuk melihat radar multi-hop"
                      className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all flex items-center space-x-1.5 cursor-pointer"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      <span>{capacityMbps}M • {ispHealth?.latencyMs || 15}ms</span>
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  Network Activity & Data Insight
                </p>
              </div>
            </div>

          {/* Desktop Navigation Tabs (Hidden on Mobile) */}
          <nav className="hidden md:flex items-center space-x-1 sm:space-x-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => onSelectTab('live')}
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                currentTab === 'live'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Wifi className="w-4 h-4" />
              <span>Live Monitor</span>
            </button>

            <button
              onClick={() => onSelectTab('history')}
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                currentTab === 'history'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <LineChart className="w-4 h-4" />
              <span>History</span>
            </button>

            <button
              onClick={() => onSelectTab('aggregate')}
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                currentTab === 'aggregate'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Aggregates</span>
            </button>

            <button
              onClick={() => onSelectTab('security')}
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                currentTab === 'security'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Security</span>
            </button>

            <button
              onClick={() => onSelectTab('diagnostics')}
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                currentTab === 'diagnostics'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Server className="w-4 h-4" />
              <span>System</span>
            </button>
          </nav>

          {/* Connection Status & Speedtest / Settings Actions */}
          <div className="flex items-center space-x-2 text-xs">
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                title="Open Settings"
                className="p-1.5 sm:p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all"
              >
                <Sliders className="w-4 h-4 text-slate-300" />
              </button>
            )}

            {onOpenSpeedTest && (
              <button
                onClick={onOpenSpeedTest}
                className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-md shadow-blue-500/20 transition-all text-xs"
              >
                <Activity className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Speed Test</span>
              </button>
            )}

            {!routerConnected ? (
              <div className="flex items-center space-x-1 px-2 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20" title={routerError || 'Mikrotik disconnected'}>
                <AlertCircle className="w-3.5 h-3.5" />
                <span className="font-medium text-[11px] hidden sm:inline">Router Offline</span>
              </div>
            ) : wsConnected ? (
              <div className="flex items-center space-x-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-medium text-[11px] hidden sm:inline">Live (5s)</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                <span className="font-medium text-[11px] hidden sm:inline">Syncing</span>
              </div>
            )}

            {lastUpdated && (
              <div className="hidden lg:block text-slate-400 font-mono-num text-[11px]">
                {formatTimeOnly(lastUpdated)}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>

    {/* ISP SLA Degradation Notification Bar */}
    {isIspDegraded && (
      <div
        onClick={onOpenIspHealth}
        className={`px-3 py-2 text-center text-xs flex items-center justify-center space-x-2 cursor-pointer transition-all border-b shadow-md ${
          isIspCritical
            ? 'bg-gradient-to-r from-rose-950 via-rose-900 to-rose-950 border-rose-800/80 text-rose-100'
            : 'bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 border-amber-800/80 text-amber-100'
        }`}
      >
        <span className="font-extrabold flex items-center space-x-1.5">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-300 animate-pulse" />
          <span>
            {isIspCritical
              ? `PERINGATAN KRITIS: Terdeteksi ${ispHealth?.packetLossPercent}% Packet Loss & ${ispHealth?.latencyMs}ms Latensi ke Upstream ISP!`
              : `SLA ISP Terdegradasi: Latensi ${ispHealth?.latencyMs}ms / ${ispHealth?.packetLossPercent}% Packet Loss.`}
          </span>
        </span>
        <span className="underline font-semibold opacity-90 hover:opacity-100 hidden sm:inline ml-1">
          Buka Bukti Multi-Hop & Salin Komplain →
        </span>
      </div>
    )}
    </>
  );
};


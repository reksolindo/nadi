import React from 'react';
import { Users, ArrowDownCircle, ArrowUpCircle, Gauge } from 'lucide-react';
import { formatSpeed } from '../lib/format.js';
import type { NetworkSummary } from '../../server/types.js';

interface SummaryCardsProps {
  summary: NetworkSummary | null;
  onOpenSpeedTest?: () => void;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary, onOpenSpeedTest }) => {
  const activeUsers = summary?.totalActiveUsers ?? 0;
  const rxSpeed = formatSpeed(summary?.totalRxRateBps);
  const txSpeed = formatSpeed(summary?.totalTxRateBps);
  const utilization = summary?.utilizationPercent ?? 0;
  const capacityMbps = summary?.capacityMbps ?? 200;
  const wan = summary?.wanInterface;

  // Utilization Color Logic
  const getUtilizationColor = (val: number) => {
    if (val >= 85) return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    if (val >= 60) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  };

  const getProgressColor = (val: number) => {
    if (val >= 85) return 'bg-gradient-to-r from-rose-500 to-red-600';
    if (val >= 60) return 'bg-gradient-to-r from-amber-500 to-orange-500';
    return 'bg-gradient-to-r from-blue-500 to-emerald-500';
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
      {/* 1. Active Users */}
      <div className="relative overflow-hidden bg-slate-900/70 border border-slate-800/80 rounded-2xl p-3.5 sm:p-5 shadow-sm hover:border-slate-700/80 transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">
              Active Users
            </p>
            <div className="p-2 sm:p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
              <Users className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
          </div>
          <div className="mt-1 sm:mt-2 flex items-baseline space-x-1 sm:space-x-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono-num">
              {activeUsers}
            </span>
            <span className="text-[10px] sm:text-xs text-slate-400">devices</span>
          </div>
        </div>
        <p className="mt-2 sm:mt-3 text-[10px] sm:text-xs text-slate-500 truncate">
          Captive Hotspot Users
        </p>
      </div>

      {/* 2. Total Download */}
      <div className="relative overflow-hidden bg-slate-900/70 border border-slate-800/80 rounded-2xl p-3.5 sm:p-5 shadow-sm hover:border-slate-700/80 transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">
              Download
            </p>
            <div className="p-2 sm:p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
              <ArrowDownCircle className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
          </div>
          <div className="mt-1 sm:mt-2 flex items-baseline space-x-1 sm:space-x-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-blue-400 tracking-tight font-mono-num">
              {rxSpeed.value}
            </span>
            <span className="text-xs sm:text-sm font-bold text-blue-400/80 font-mono-num">{rxSpeed.unit}</span>
          </div>
        </div>
        <div className="mt-2 sm:mt-3 flex items-center justify-between text-[10px] sm:text-xs text-slate-500">
          <span className="truncate">Live DL Traffic</span>
          {wan && <span className="font-mono-num text-[10px] sm:text-[11px] text-slate-400 hidden sm:inline">WAN: {formatSpeed(wan.rxRateBps).value} {formatSpeed(wan.rxRateBps).unit}</span>}
        </div>
      </div>

      {/* 3. Total Upload */}
      <div className="relative overflow-hidden bg-slate-900/70 border border-slate-800/80 rounded-2xl p-3.5 sm:p-5 shadow-sm hover:border-slate-700/80 transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">
              Upload
            </p>
            <div className="p-2 sm:p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <ArrowUpCircle className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
          </div>
          <div className="mt-1 sm:mt-2 flex items-baseline space-x-1 sm:space-x-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400 tracking-tight font-mono-num">
              {txSpeed.value}
            </span>
            <span className="text-xs sm:text-sm font-bold text-emerald-400/80 font-mono-num">{txSpeed.unit}</span>
          </div>
        </div>
        <div className="mt-2 sm:mt-3 flex items-center justify-between text-[10px] sm:text-xs text-slate-500">
          <span className="truncate">Live UL Traffic</span>
          {wan && <span className="font-mono-num text-[10px] sm:text-[11px] text-slate-400 hidden sm:inline">WAN: {formatSpeed(wan.txRateBps).value} {formatSpeed(wan.txRateBps).unit}</span>}
        </div>
      </div>

      {/* 4. ISP Capacity Utilization & Speedtest CTA */}
      <div className="relative overflow-hidden bg-slate-900/70 border border-slate-800/80 rounded-2xl p-3.5 sm:p-5 shadow-sm hover:border-slate-700/80 transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">
              Saturation
            </p>
            <div className={`p-2 sm:p-3 rounded-xl border ${getUtilizationColor(utilization)}`}>
              <Gauge className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
          </div>
          <div className="mt-1 sm:mt-2 flex items-baseline space-x-1 sm:space-x-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono-num">
              {utilization}%
            </span>
            <span className="text-[10px] sm:text-xs text-slate-400">/ {capacityMbps}M</span>
          </div>

          {/* Progress Bar */}
          <div className="mt-2">
            <div className="w-full bg-slate-800 h-1.5 sm:h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${getProgressColor(utilization)}`}
                style={{ width: `${Math.min(100, Math.max(0, utilization))}%` }}
              />
            </div>
          </div>
        </div>

        {onOpenSpeedTest && (
          <button
            onClick={onOpenSpeedTest}
            className="mt-2 sm:mt-3 pt-1.5 sm:pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] sm:text-[11px] text-blue-400 hover:text-blue-300 font-semibold group transition-colors text-left"
          >
            <span>Run Speed Test</span>
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </button>
        )}
      </div>
    </div>
  );
};

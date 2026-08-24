import React from 'react';
import { Flame, ArrowDown, ArrowUp, ArrowRight, User, Search } from 'lucide-react';
import { formatSpeed } from '../lib/format.js';
import type { NetworkSummary } from '../../server/types.js';

interface TopConsumerCardProps {
  topConsumer: NetworkSummary['topConsumer'];
  totalRxRateBps?: number;
  onViewHistory: (username: string) => void;
  onInspectTraffic?: (ip: string, username?: string) => void;
}

export const TopConsumerCard: React.FC<TopConsumerCardProps> = ({
  topConsumer,
  totalRxRateBps = 0,
  onViewHistory,
  onInspectTraffic,
}) => {
  if (!topConsumer || topConsumer.rxRateBps === 0) {
    return null;
  }

  const rxSpeed = formatSpeed(topConsumer.rxRateBps);
  const txSpeed = formatSpeed(topConsumer.txRateBps);

  // Calculate percentage of office download traffic consumed by this single user
  const shareOfTraffic = totalRxRateBps > 0
    ? Math.min(100, Math.round((topConsumer.rxRateBps / totalRxRateBps) * 100))
    : 0;

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900/90 to-orange-950/30 border border-orange-500/30 rounded-2xl p-5 shadow-lg shadow-orange-500/5 glow-orange transition-all">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: User identity and flame badge */}
        <div className="flex items-start sm:items-center space-x-4">
          <div className="p-3.5 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl text-white shadow-lg shadow-orange-500/30 flex-shrink-0 animate-pulse-subtle">
            <Flame className="w-6 h-6" />
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
                Top Bandwidth Consumer
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                {shareOfTraffic}% Total Traffic
              </span>
            </div>

            <div className="flex items-center space-x-2 mt-1">
              <User className="w-4 h-4 text-slate-400" />
              <h3 className="text-xl font-extrabold text-white tracking-tight font-mono-num">
                {topConsumer.username}
              </h3>
              <span className="text-xs text-slate-400 font-mono-num">
                ({topConsumer.ipAddress})
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono-num mt-0.5">
              MAC: {topConsumer.macAddress}
            </p>
          </div>
        </div>

        {/* Right: Live consumption and action */}
        <div className="flex items-center justify-between sm:justify-end space-x-4 sm:space-x-6">
          <div className="flex items-center space-x-4">
            {/* Download */}
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-end space-x-1">
                <ArrowDown className="w-3 h-3 text-blue-400" />
                <span>Download</span>
              </p>
              <p className="text-lg font-bold text-blue-400 font-mono-num">
                {rxSpeed.value} <span className="text-xs font-semibold text-blue-400/80">{rxSpeed.unit}</span>
              </p>
            </div>

            {/* Upload */}
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-end space-x-1">
                <ArrowUp className="w-3 h-3 text-emerald-400" />
                <span>Upload</span>
              </p>
              <p className="text-lg font-bold text-emerald-400 font-mono-num">
                {txSpeed.value} <span className="text-xs font-semibold text-emerald-400/80">{txSpeed.unit}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            {onInspectTraffic && (
              <button
                onClick={() => onInspectTraffic(topConsumer.ipAddress, topConsumer.username)}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-orange-400 hover:text-orange-300 text-xs font-bold border border-orange-500/30 transition-all hover:scale-105 active:scale-95"
                title="Inspect active connection streams and resolved website domains"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Inspect Streams</span>
              </button>
            )}

            <button
              onClick={() => onViewHistory(topConsumer.username)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-md shadow-orange-500/20 transition-all hover:scale-105 active:scale-95"
            >
              <span>History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import {
  Compass,
  Play,
  Film,
  Video,
  PhoneCall,
  DownloadCloud,
  Globe,
  Radio,
  Gamepad2,
  Cloud,
  MessageSquare,
  Sparkles,
  ArrowDown,
  ArrowUp
} from 'lucide-react';
import type { LiveTrafficDestination } from '../../server/types.js';
import { formatSpeed } from '../lib/format.js';

interface LiveDestinationBreakdownProps {
  destinations?: LiveTrafficDestination[];
  totalRxRateBps?: number;
  totalTxRateBps?: number;
  capacityMbps?: number;
}

export const LiveDestinationBreakdown: React.FC<LiveDestinationBreakdownProps> = ({
  destinations = [],
  totalRxRateBps = 0,
  totalTxRateBps = 0,
  capacityMbps = 200,
}) => {
  const getAppIcon = (key: string) => {
    switch (key) {
      case 'youtube':
        return <Play className="w-4 h-4 text-rose-400 fill-rose-400/20" />;
      case 'meta':
        return <Film className="w-4 h-4 text-purple-400" />;
      case 'tiktok':
        return <Video className="w-4 h-4 text-cyan-400" />;
      case 'zoom':
      case 'teams':
      case 'google':
        return <PhoneCall className="w-4 h-4 text-emerald-400" />;
      case 'windows':
      case 'google_play':
        return <DownloadCloud className="w-4 h-4 text-amber-400" />;
      case 'gaming':
        return <Gamepad2 className="w-4 h-4 text-red-400" />;
      case 'whatsapp':
        return <MessageSquare className="w-4 h-4 text-green-400" />;
      case 'cloud':
        return <Cloud className="w-4 h-4 text-sky-400" />;
      default:
        return <Globe className="w-4 h-4 text-blue-400" />;
    }
  };

  const getProgressColor = (key: string) => {
    switch (key) {
      case 'youtube':
        return 'from-rose-500 to-red-600';
      case 'meta':
        return 'from-purple-500 to-pink-600';
      case 'tiktok':
        return 'from-cyan-500 to-teal-600';
      case 'zoom':
      case 'teams':
      case 'google':
        return 'from-emerald-500 to-green-600';
      case 'windows':
      case 'google_play':
        return 'from-amber-500 to-orange-600';
      case 'gaming':
        return 'from-rose-600 to-amber-600';
      case 'whatsapp':
        return 'from-emerald-400 to-teal-500';
      default:
        return 'from-blue-500 to-indigo-600';
    }
  };

  const activeDestinations = destinations && destinations.length > 0 ? destinations : [];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800/80">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                Live Bandwidth Drain by Destination & App
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                Real-Time Flow
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live traffic classification showing which platforms and services are actively consuming WAN bandwidth
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono self-start sm:self-auto">
          <span className="text-slate-400 font-semibold">Active Services:</span>
          <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-white font-bold">
            {activeDestinations.length} Categories
          </span>
        </div>
      </div>

      {/* Destinations List */}
      <div className="pt-4 space-y-3">
        {activeDestinations.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs font-medium space-y-1">
            <Radio className="w-6 h-6 text-slate-600 mx-auto animate-pulse" />
            <p>Analyzing active connection flows across router interface...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {activeDestinations.map((dest) => {
              const dlSpeed = formatSpeed(dest.downloadRateBps);
              const ulSpeed = formatSpeed(dest.uploadRateBps);
              const progressGradient = getProgressColor(dest.appIconKey);

              return (
                <div
                  key={dest.id}
                  className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-2.5 hover:border-slate-700 transition-all"
                >
                  {/* Top Line: App Name + Badge + Share */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 truncate">
                      <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 flex-shrink-0">
                        {getAppIcon(dest.appIconKey)}
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold text-white tracking-tight truncate flex items-center gap-1.5">
                          <span className="truncate">{dest.name}</span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[9px] font-semibold flex-shrink-0">
                            {dest.badge}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          {dest.explanation}
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 ml-2">
                      <span className="text-xs font-extrabold text-white font-mono-num">
                        {dest.percentageOfWan}%
                      </span>
                      <div className="text-[9px] text-slate-400 font-mono-num">
                        {dest.activeStreamsCount} streams
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800/50">
                    <div
                      className={`bg-gradient-to-r ${progressGradient} h-full rounded-full transition-all duration-700`}
                      style={{ width: `${Math.max(4, dest.percentageOfWan)}%` }}
                    />
                  </div>

                  {/* Bottom Line: Live Speeds & Raw Domain Info */}
                  <div className="flex items-center justify-between text-[11px] font-mono-num pt-0.5">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1 text-emerald-400 font-bold">
                        <ArrowDown className="w-3 h-3" />
                        <span>{dlSpeed.value} {dlSpeed.unit}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-sky-400 font-bold">
                        <ArrowUp className="w-3 h-3" />
                        <span>{ulSpeed.value} {ulSpeed.unit}</span>
                      </div>
                    </div>

                    {dest.sampleDomain && (
                      <span
                        className="text-[9px] text-slate-400 bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-800 truncate max-w-[140px] sm:max-w-[180px]"
                        title={dest.sampleDomain}
                      >
                        {dest.sampleDomain}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

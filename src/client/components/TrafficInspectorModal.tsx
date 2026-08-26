import React, { useState, useEffect } from 'react';
import { X, Activity, Globe, Film, DownloadCloud, PhoneCall, Gamepad2, Layers, RefreshCw, ArrowUpRight, ShieldAlert, AlertCircle } from 'lucide-react';
import { fetchUserTrafficBreakdown } from '../lib/api.js';
import { formatBytes, formatSpeed } from '../lib/format.js';
import type { UserTrafficAnalysis, UserConnectionDetail } from '../../server/types.js';

interface TrafficInspectorModalProps {
  userIp: string;
  username?: string;
  onClose: () => void;
}

export const TrafficInspectorModal: React.FC<TrafficInspectorModalProps> = ({
  userIp,
  username,
  onClose,
}) => {
  const [data, setData] = useState<UserTrafficAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    setIsLoading(true);
    setError(null);
    fetchUserTrafficBreakdown(userIp, username)
      .then((res) => {
        if (res.success) {
          setData(res);
        } else {
          setError(res.error || 'Gagal memuat analisis koneksi');
        }
      })
      .catch((err) => {
        setError(err.message || 'Gagal terhubung ke API inspeksi');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [userIp, username]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Streaming & Media':
        return <Film className="w-4 h-4 text-purple-400" />;
      case 'Web & Cloud Services':
        return <Globe className="w-4 h-4 text-blue-400" />;
      case 'File Transfer & Downloads':
        return <DownloadCloud className="w-4 h-4 text-amber-400" />;
      case 'VoIP & Meetings':
        return <PhoneCall className="w-4 h-4 text-emerald-400" />;
      case 'Gaming & Apps':
        return <Gamepad2 className="w-4 h-4 text-rose-400" />;
      default:
        return <Layers className="w-4 h-4 text-slate-400" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Streaming & Media':
        return 'bg-purple-500 text-purple-200 border-purple-500/30';
      case 'Web & Cloud Services':
        return 'bg-blue-500 text-blue-200 border-blue-500/30';
      case 'File Transfer & Downloads':
        return 'bg-amber-500 text-amber-200 border-amber-500/30';
      case 'VoIP & Meetings':
        return 'bg-emerald-500 text-emerald-200 border-emerald-500/30';
      case 'Gaming & Apps':
        return 'bg-rose-500 text-rose-200 border-rose-500/30';
      default:
        return 'bg-slate-700 text-slate-200 border-slate-600';
    }
  };

  // Simplifies cryptic CDN domains into clear, human-readable titles and explanations
  const formatStreamDetails = (domainName?: string, serviceName?: string) => {
    const d = (domainName || '').toLowerCase();
    const s = (serviceName || '').toLowerCase();

    if (d.includes('googlevideo') || d.includes('youtube')) {
      return {
        title: 'YouTube Video Stream',
        badge: 'Google Video CDN',
        explanation: 'Streaming video buffer / playback chunk',
        raw: domainName,
      };
    }
    if (d.includes('fbcdn') || d.includes('cdninstagram') || d.includes('instagram')) {
      return {
        title: 'Instagram / Facebook Media',
        badge: 'Meta Media CDN',
        explanation: 'Reels, Stories, and photo feed transfer',
        raw: domainName,
      };
    }
    if (d.includes('tiktok') || d.includes('byteoversea') || d.includes('ibytedtos')) {
      return {
        title: 'TikTok Video Stream',
        badge: 'ByteDance CDN',
        explanation: 'Short-form video stream & Live data',
        raw: domainName,
      };
    }
    if (d.includes('netflix') || d.includes('nflxvideo')) {
      return {
        title: 'Netflix Video Stream',
        badge: 'Netflix Open Connect',
        explanation: 'High-definition video streaming buffer',
        raw: domainName,
      };
    }
    if (d.includes('spotify') || d.includes('scdn.co') || d.includes('audio-ak-spotify')) {
      return {
        title: 'Spotify Audio Streaming',
        badge: 'Spotify Music CDN',
        explanation: 'High-bitrate music playback stream',
        raw: domainName,
      };
    }
    if (d.includes('zoom') || d.includes('zoomgov')) {
      return {
        title: 'Zoom Video Conference',
        badge: 'Zoom VoIP',
        explanation: 'Real-time video/audio meeting stream',
        raw: domainName,
      };
    }
    if (d.includes('teams.microsoft') || d.includes('skype')) {
      return {
        title: 'Microsoft Teams Meeting',
        badge: 'Teams VoIP',
        explanation: 'Conference call & collaboration stream',
        raw: domainName,
      };
    }
    if (d.includes('meet.google') || d.includes('webrtc')) {
      return {
        title: 'Google Meet / WebRTC',
        badge: 'Google VoIP',
        explanation: 'Real-time video/audio communication',
        raw: domainName,
      };
    }
    if (d.includes('whatsapp')) {
      return {
        title: 'WhatsApp Call & Media Sync',
        badge: 'WhatsApp Media',
        explanation: 'Voice/video call or document download',
        raw: domainName,
      };
    }
    if (d.includes('windowsupdate') || d.includes('delivery.mp.microsoft') || d.includes('update.microsoft')) {
      return {
        title: 'Windows Update / Microsoft OS',
        badge: 'Microsoft CDN',
        explanation: 'Operating system background patch download',
        raw: domainName,
      };
    }
    if (d.includes('gvt1.com') || d.includes('gvt2.com') || d.includes('play.googleapis')) {
      return {
        title: 'Google Play Store Updates',
        badge: 'Google App Delivery',
        explanation: 'Android application downloads & updates',
        raw: domainName,
      };
    }
    if (d.includes('apple.com') || d.includes('icloud.com') || d.includes('aaplimg')) {
      return {
        title: 'Apple iCloud & App Store',
        badge: 'Apple CDN',
        explanation: 'iOS / macOS apps & iCloud sync',
        raw: domainName,
      };
    }
    if (d.includes('steampowered') || d.includes('steamcontent')) {
      return {
        title: 'Steam Game Download',
        badge: 'Valve Steam CDN',
        explanation: 'Game files download & background updates',
        raw: domainName,
      };
    }
    if (d.includes('epicgames')) {
      return {
        title: 'Epic Games Launcher',
        badge: 'Epic CDN',
        explanation: 'Game launcher & asset download',
        raw: domainName,
      };
    }
    if (d.includes('roblox') || d.includes('rbxcdn')) {
      return {
        title: 'Roblox Online Gaming',
        badge: 'Roblox Server',
        explanation: 'Multiplayer game assets & networking',
        raw: domainName,
      };
    }
    if (d.includes('cloudflare')) {
      return {
        title: 'Cloudflare Accelerated Web',
        badge: 'Cloudflare Edge',
        explanation: 'Encrypted CDN edge web traffic',
        raw: domainName,
      };
    }
    if (d.includes('akamaized') || d.includes('akamai')) {
      return {
        title: 'Akamai Global CDN',
        badge: 'Akamai Edge',
        explanation: 'Content delivery network stream',
        raw: domainName,
      };
    }
    if (d.includes('fastly')) {
      return {
        title: 'Fastly Global CDN',
        badge: 'Fastly Edge',
        explanation: 'High-speed web & media delivery',
        raw: domainName,
      };
    }
    if (d.includes('github')) {
      return {
        title: 'GitHub Code / Asset Hosting',
        badge: 'GitHub',
        explanation: 'Git repository & developer assets',
        raw: domainName,
      };
    }

    if (domainName) {
      return {
        title: serviceName || `Website (${domainName})`,
        badge: 'Web / Cloud',
        explanation: `Connection to ${domainName}`,
        raw: domainName,
      };
    }

    return {
      title: serviceName || 'Encrypted Traffic',
      badge: 'Network Stream',
      explanation: 'Direct IP communication',
      raw: undefined,
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">
                  Traffic Inspector: {username || userIp}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono-num">
                  {userIp}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Active connection streams and resolved website domains from Mikrotik connection table
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-xs font-semibold text-slate-400">
                Inspecting Mikrotik connection tracking table & DNS cache...
              </p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ) : data ? (
            <>
              {/* Traffic Category Breakdown Bar */}
              <div className="space-y-3 bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Traffic Category Distribution
                  </span>
                  <span className="text-xs text-slate-400">
                    Total: <strong className="text-white font-mono-num">{data.totalConnections}</strong> active streams
                  </span>
                </div>

                {/* Progress bar visual */}
                <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex">
                  {data.categories.map((cat, idx) => {
                    const colors = [
                      'bg-purple-500',
                      'bg-blue-500',
                      'bg-amber-500',
                      'bg-emerald-500',
                      'bg-rose-500',
                      'bg-slate-600',
                    ];
                    return (
                      <div
                        key={cat.category}
                        className={`${colors[idx % colors.length]} h-full transition-all`}
                        style={{ width: `${cat.percentage}%` }}
                        title={`${cat.category}: ${cat.percentage}%`}
                      />
                    );
                  })}
                </div>

                {/* Category Legend & Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
                  {data.categories.map((cat) => (
                    <div
                      key={cat.category}
                      className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-2.5 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5 font-semibold text-slate-200">
                          {getCategoryIcon(cat.category)}
                          <span className="truncate">{cat.category}</span>
                        </div>
                        <span className="font-bold text-white font-mono-num">{cat.percentage}%</span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono-num">
                        {cat.connectionCount} streams • {cat.topServices.join(', ')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Connection Streams Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Active Connection Streams (Simplified & Explained)
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Showing top {data.connections.length} streams
                  </span>
                </div>

                <div className="border border-slate-800 rounded-xl overflow-hidden overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3 w-28">Protocol & Port</th>
                        <th className="py-2.5 px-3">Application / Website Activity</th>
                        <th className="py-2.5 px-3">Destination (IP:Port)</th>
                        <th className="py-2.5 px-3">Transferred</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {data.connections.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500">
                            No active connections found for IP {userIp}
                          </td>
                        </tr>
                      ) : (
                        data.connections.map((conn) => {
                          const streamTotal = (conn.origBytes || 0) + (conn.replBytes || 0);
                          const bytesDisplay = formatBytes(streamTotal);
                          const details = formatStreamDetails(conn.domainName, conn.serviceName);

                          return (
                            <tr key={conn.id} className="hover:bg-slate-800/40 transition-colors">
                              <td className="py-2.5 px-3 font-mono-num font-medium">
                                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 uppercase text-[10px] font-bold mr-1.5">
                                  {conn.protocol}
                                </span>
                                <span>:{conn.dstPort}</span>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center space-x-2">
                                  {getCategoryIcon(conn.category)}
                                  <span className="font-bold text-white tracking-tight text-xs">
                                    {details.title}
                                  </span>
                                  <span className="px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-medium">
                                    {details.badge}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-2 mt-0.5">
                                  <span className="text-slate-300 font-medium">{details.explanation}</span>
                                  {details.raw && (
                                    <>
                                      <span className="text-slate-600">•</span>
                                      <span className="font-mono text-[10px] text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 truncate max-w-xs">
                                        {details.raw}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 font-mono-num text-slate-300">
                                <div className="flex items-center space-x-1">
                                  <span>{conn.dstAddress}</span>
                                  <ArrowUpRight className="w-3 h-3 text-slate-500" />
                                </div>
                              </td>
                              <td className="py-2.5 px-3 font-mono-num">
                                <span className="font-bold text-white text-xs">{bytesDisplay.value}</span>{' '}
                                <span className="text-[10px] text-slate-400 font-semibold">{bytesDisplay.unit}</span>
                              </td>
                              <td className="py-2.5 px-3 font-mono-num text-slate-400 text-[11px]">
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                                  {conn.state || 'established'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>Data retrieved directly from RouterOS Connection Tracking</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

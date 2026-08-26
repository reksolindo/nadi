import React, { useState, useMemo } from 'react';
import { Search, ArrowUpDown, ArrowDown, ArrowUp, Flame, Clock, LineChart, Wifi } from 'lucide-react';
import { formatSpeed, formatBytes, cleanUptime } from '../lib/format.js';
import type { UserBandwidthSample } from '../../server/types.js';

interface LiveTableProps {
  users: UserBandwidthSample[];
  topUsername?: string;
  onSelectUser: (username: string) => void;
  onInspectTraffic?: (ip: string, username?: string) => void;
}

type SortField = 'rxRate' | 'txRate' | 'rxBytes' | 'username';
type SortOrder = 'asc' | 'desc';

export const LiveTable: React.FC<LiveTableProps> = ({ users, topUsername, onSelectUser, onInspectTraffic }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('rxRate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Max download speed among active users for relative progress bar scaling
  const maxRx = useMemo(() => {
    return Math.max(1, ...users.map((u) => u.rxRateBps));
  }, [users]);

  // Filter and Sort
  const filteredUsers = useMemo(() => {
    let list = [...users];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          u.ipAddress.includes(q) ||
          u.macAddress.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'rxRate') {
        comparison = a.rxRate - b.rxRate;
      } else if (sortField === 'txRate') {
        comparison = a.txRate - b.txRate;
      } else if (sortField === 'rxBytes') {
        comparison = a.rxBytes - b.rxBytes;
      } else if (sortField === 'username') {
        comparison = a.username.localeCompare(b.username);
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return list;
  }, [users, searchQuery, sortField, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl shadow-sm overflow-hidden">
      {/* Header controls: Search & Count */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <span>Real-Time Active Hotspot Users</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono-num">
              {filteredUsers.length} active
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Synchronized directly with Mikrotik dynamic queues every 5 seconds
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search username, IP, or MAC..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono-num"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Desktop Table (Hidden on Mobile) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
            <tr>
              <th className="py-3 px-4 w-12 text-center">#</th>
              <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => toggleSort('username')}>
                <div className="flex items-center space-x-1">
                  <span>User & Session</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4">IP & MAC Address</th>
              <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => toggleSort('rxRate')}>
                <div className="flex items-center space-x-1">
                  <ArrowDown className="w-3 h-3 text-blue-400" />
                  <span>Download Speed</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => toggleSort('txRate')}>
                <div className="flex items-center space-x-1">
                  <ArrowUp className="w-3 h-3 text-emerald-400" />
                  <span>Upload Speed</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => toggleSort('rxBytes')}>
                <div className="flex items-center space-x-1">
                  <span>Session Data</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/60">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Wifi className="w-8 h-8 text-slate-600 animate-pulse" />
                    <p className="text-sm font-medium">No active users found</p>
                    <p className="text-xs text-slate-600">Ensure MikroTik router is online and active users are authenticated</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredUsers.map((user, idx) => {
                const isTop = user.username === topUsername;
                const rx = formatSpeed(user.rxRateBps);
                const tx = formatSpeed(user.txRateBps);
                const totalRx = formatBytes(user.rxBytes);
                const totalTx = formatBytes(user.txBytes);
                const rxPercent = maxRx > 0 ? (user.rxRateBps / maxRx) * 100 : 0;

                return (
                  <tr
                    key={`${user.username}-${user.ipAddress}`}
                    className={`group transition-colors ${
                      isTop
                        ? 'bg-gradient-to-r from-orange-950/20 via-slate-900/80 to-transparent hover:bg-orange-950/30'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-3.5 px-4 text-center font-mono-num font-bold text-slate-400">
                      {isTop ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                          <Flame className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span className="text-slate-500">{idx + 1}</span>
                      )}
                    </td>

                    {/* Username & Session Uptime */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white font-mono-num text-sm group-hover:text-blue-400 transition-colors">
                          {user.username}
                        </span>
                        {isTop && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                            TOP
                          </span>
                        )}
                      </div>
                      {user.uptime && (
                        <div className="flex items-center space-x-1 text-[11px] text-slate-400 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>Uptime: {cleanUptime(user.uptime)}</span>
                        </div>
                      )}
                    </td>

                    {/* IP & MAC */}
                    <td className="py-3.5 px-4 font-mono-num">
                      <div className="text-slate-200 font-medium">{user.ipAddress}</div>
                      <div className="text-[11px] text-slate-400">{user.macAddress || '-'}</div>
                    </td>

                    {/* Download Speed */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-baseline space-x-1.5 font-mono-num">
                        <span className="text-sm font-bold text-blue-400">{rx.value}</span>
                        <span className="text-[11px] font-semibold text-blue-400/80">{rx.unit}</span>
                      </div>
                      <div className="w-24 bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="bg-blue-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(2, rxPercent))}%` }}
                        />
                      </div>
                    </td>

                    {/* Upload Speed */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-baseline space-x-1.5 font-mono-num">
                        <span className="text-sm font-bold text-emerald-400">{tx.value}</span>
                        <span className="text-[11px] font-semibold text-emerald-400/80">{tx.unit}</span>
                      </div>
                    </td>

                    {/* Total Data */}
                    <td className="py-3.5 px-4 font-mono-num">
                      <div className="text-slate-300">
                        <span className="text-slate-400 text-[10px]">DL: </span>
                        {totalRx.full}
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        <span className="text-slate-400 text-[10px]">UL: </span>
                        {totalTx.full}
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {onInspectTraffic && (
                          <button
                            onClick={() => onInspectTraffic(user.ipAddress, user.username)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-orange-400 hover:text-orange-300 border border-orange-500/20 transition-all text-xs font-semibold"
                            title={`Inspect connection streams for ${user.username}`}
                          >
                            <Search className="w-3.5 h-3.5" />
                            <span>Inspect</span>
                          </button>
                        )}

                        <button
                          onClick={() => onSelectUser(user.username)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white transition-all text-xs font-semibold"
                          title={`View history for ${user.username}`}
                        >
                          <LineChart className="w-3.5 h-3.5" />
                          <span>History</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List View (Visible on Mobile only) */}
      <div className="block md:hidden divide-y divide-slate-800/80">
        {filteredUsers.length === 0 ? (
          <div className="py-12 text-center text-slate-500 px-4">
            <Wifi className="w-8 h-8 text-slate-600 animate-pulse mx-auto mb-2" />
            <p className="text-sm font-medium">No active users found</p>
          </div>
        ) : (
          filteredUsers.map((user, idx) => {
            const isTop = user.username === topUsername;
            const rx = formatSpeed(user.rxRateBps);
            const tx = formatSpeed(user.txRateBps);
            const totalRx = formatBytes(user.rxBytes);
            const totalTx = formatBytes(user.txBytes);

            return (
              <div
                key={`mobile-${user.username}-${user.ipAddress}`}
                className={`p-3.5 space-y-3 transition-colors ${
                  isTop ? 'bg-orange-950/15' : 'hover:bg-slate-900/40'
                }`}
              >
                {/* Top Row: User + Badge + Rank */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-slate-800 text-[10px] font-bold text-slate-400 font-mono-num">
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-white text-sm font-mono-num">
                      {user.username}
                    </span>
                    {isTop && (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                        TOP
                      </span>
                    )}
                  </div>

                  {user.uptime && (
                    <span className="text-[10px] text-slate-400 font-mono-num flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {cleanUptime(user.uptime)}
                    </span>
                  )}
                </div>

                {/* Sub row: IP & MAC */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono-num">
                  <span>{user.ipAddress}</span>
                  <span className="text-slate-500">{user.macAddress || '-'}</span>
                </div>

                {/* Speed & Transferred Matrix */}
                <div className="grid grid-cols-2 gap-2 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 font-mono-num">
                  <div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1 font-semibold uppercase">
                      <ArrowDown className="w-3 h-3 text-blue-400" />
                      <span>Download</span>
                    </div>
                    <div className="text-sm font-bold text-blue-400 mt-0.5">
                      {rx.value} <span className="text-[10px] text-blue-400/80">{rx.unit}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Total: {totalRx.full}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1 font-semibold uppercase">
                      <ArrowUp className="w-3 h-3 text-emerald-400" />
                      <span>Upload</span>
                    </div>
                    <div className="text-sm font-bold text-emerald-400 mt-0.5">
                      {tx.value} <span className="text-[10px] text-emerald-400/80">{tx.unit}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Total: {totalTx.full}
                    </div>
                  </div>
                </div>

                {/* Action Buttons (Touch Friendly) */}
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  {onInspectTraffic && (
                    <button
                      onClick={() => onInspectTraffic(user.ipAddress, user.username)}
                      className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-orange-400 border border-orange-500/20 font-bold text-xs flex items-center justify-center space-x-1.5 transition-all"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>Inspect Traffic</span>
                    </button>
                  )}
                  <button
                    onClick={() => onSelectUser(user.username)}
                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white border border-slate-700/60 font-bold text-xs flex items-center justify-center space-x-1.5 transition-all"
                  >
                    <LineChart className="w-3.5 h-3.5" />
                    <span>View History</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

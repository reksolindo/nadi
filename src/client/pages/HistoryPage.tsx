import React, { useState, useEffect, useMemo } from 'react';
import { BandwidthChart } from '../components/BandwidthChart.js';
import { fetchUserHistory } from '../lib/api.js';
import { User, Search, Wifi } from 'lucide-react';
import type { UserBandwidthSample, HistoricalDataPoint } from '../../server/types.js';

interface HistoryPageProps {
  initialUsername?: string;
  activeUsers: UserBandwidthSample[];
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  initialUsername,
  activeUsers,
}) => {
  const [selectedUser, setSelectedUser] = useState<string>(
    initialUsername || activeUsers[0]?.username || ''
  );
  const [range, setRange] = useState<string>('1h');
  const [data, setData] = useState<HistoricalDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [userSearch, setUserSearch] = useState<string>('');

  // Update selectedUser if initialUsername changes from parent
  useEffect(() => {
    if (initialUsername) {
      setSelectedUser(initialUsername);
    }
  }, [initialUsername]);

  // Set default if empty and users arrive
  useEffect(() => {
    if (!selectedUser && activeUsers.length > 0) {
      setSelectedUser(activeUsers[0].username);
    }
  }, [activeUsers, selectedUser]);

  // Fetch history when user or range changes
  useEffect(() => {
    if (!selectedUser) return;

    let isMounted = true;
    setIsLoading(true);

    fetchUserHistory(selectedUser, range)
      .then((res) => {
        if (isMounted && res.success) {
          setData(res.data || []);
        }
      })
      .catch((err) => {
        console.error('Failed to load user history:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedUser, range]);

  // User list filtered by search
  const filteredUserList = useMemo(() => {
    if (!userSearch.trim()) return activeUsers;
    const q = userSearch.toLowerCase().trim();
    return activeUsers.filter(
      (u) => u.username.toLowerCase().includes(q) || u.ipAddress.includes(q)
    );
  }, [activeUsers, userSearch]);

  const activeProfile = useMemo(() => {
    return activeUsers.find((u) => u.username === selectedUser);
  }, [activeUsers, selectedUser]);

  return (
    <div className="space-y-6">
      {/* Top User Selection Bar */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <User className="w-5 h-5 text-blue-400" />
              <span>Select User for Historical Analysis</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select a Hotspot user to analyze historical bandwidth consumption patterns
            </p>
          </div>

          {/* Quick User Selector Dropdown & Search */}
          <div className="flex items-center space-x-2">
            <div className="relative w-48 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search user..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono-num"
              />
            </div>

            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-blue-500 font-mono-num cursor-pointer"
            >
              {filteredUserList.map((u) => (
                <option key={u.username} value={u.username}>
                  {u.username} ({u.ipAddress})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick User Chips */}
        {activeUsers.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-[11px] font-semibold text-slate-400 flex-shrink-0 mr-1">
              Active Users:
            </span>
            {activeUsers.slice(0, 10).map((u) => (
              <button
                key={u.username}
                onClick={() => setSelectedUser(u.username)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono-num font-semibold transition-all flex-shrink-0 ${
                  selectedUser === u.username
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800/60'
                }`}
              >
                {u.username}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected User Info Badge if Active */}
      {activeProfile && (
        <div className="flex items-center justify-between bg-slate-900/40 border border-slate-800/60 px-4 py-2.5 rounded-xl text-xs">
          <div className="flex items-center space-x-3">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-bold text-white font-mono-num">{activeProfile.username}</span>
            <span className="text-slate-400 font-mono-num">IP: {activeProfile.ipAddress}</span>
            <span className="text-slate-400 font-mono-num hidden sm:inline">MAC: {activeProfile.macAddress}</span>
          </div>

          <div className="flex items-center space-x-2 text-slate-400">
            <Wifi className="w-3.5 h-3.5 text-blue-400" />
            <span>Active Hotspot Session</span>
          </div>
        </div>
      )}

      {/* Bandwidth Chart */}
      <BandwidthChart
        data={data}
        username={selectedUser}
        range={range}
        onRangeChange={setRange}
        isLoading={isLoading}
      />
    </div>
  );
};

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { formatSpeed, formatDateTime, formatTimeOnly } from '../lib/format.js';
import { ArrowDown, ArrowUp, Zap, BarChart2 } from 'lucide-react';
import type { HistoricalDataPoint } from '../../server/types.js';

interface BandwidthChartProps {
  data: HistoricalDataPoint[];
  username?: string;
  range: string;
  onRangeChange: (range: string) => void;
  isLoading?: boolean;
}

export const BandwidthChart: React.FC<BandwidthChartProps> = ({
  data,
  username,
  range,
  onRangeChange,
  isLoading = false,
}) => {
  // Compute chart statistics
  const stats = useMemo(() => {
    let peakRxBps = 0;
    let peakTxBps = 0;
    let sumRxBps = 0;
    let sumTxBps = 0;

    for (const point of data) {
      const rxBps = point.rxRateBps || (point.rxRate * 8);
      const txBps = point.txRateBps || (point.txRate * 8);

      if (rxBps > peakRxBps) peakRxBps = rxBps;
      if (txBps > peakTxBps) peakTxBps = txBps;

      sumRxBps += rxBps;
      sumTxBps += txBps;
    }

    const count = Math.max(1, data.length);
    const avgRxBps = Math.round(sumRxBps / count);
    const avgTxBps = Math.round(sumTxBps / count);

    return {
      peakRx: formatSpeed(peakRxBps),
      peakTx: formatSpeed(peakTxBps),
      avgRx: formatSpeed(avgRxBps),
      avgTx: formatSpeed(avgTxBps),
    };
  }, [data]);

  // Format data points for Recharts (convert to Mbps or Kbps for numeric axis)
  const chartData = useMemo(() => {
    return data.map((d) => {
      const rxBps = d.rxRateBps || (d.rxRate * 8);
      const txBps = d.txRateBps || (d.txRate * 8);

      return {
        timestamp: d.timestamp,
        downloadMbps: Number((rxBps / 1_000_000).toFixed(2)),
        uploadMbps: Number((txBps / 1_000_000).toFixed(2)),
        rawRxBps: rxBps,
        rawTxBps: txBps,
      };
    });
  }, [data]);

  // Range button labels
  const ranges = [
    { id: '1h', label: '1 Hour' },
    { id: '6h', label: '6 Hours' },
    { id: '24h', label: '24 Hours' },
    { id: '7d', label: '7 Days' },
    { id: '30d', label: '30 Days' },
  ];

  return (
    <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-6">
      {/* Top Header: Title & Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-bold text-white tracking-tight">
              {username ? `Bandwidth History: ${username}` : 'Historical Bandwidth Usage'}
            </h3>
            {isLoading && (
              <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 animate-pulse">
                Loading...
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time speed telemetry and consumption over selected time window
          </p>
        </div>

        {/* Range Selector */}
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {ranges.map((r) => (
            <button
              key={r.id}
              onClick={() => onRangeChange(r.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                range === r.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Mini-cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center space-x-1">
            <Zap className="w-3 h-3 text-blue-400" />
            <span>Peak Download</span>
          </p>
          <p className="text-base font-bold text-blue-400 font-mono-num mt-1">
            {stats.peakRx.full}
          </p>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center space-x-1">
            <Zap className="w-3 h-3 text-emerald-400" />
            <span>Peak Upload</span>
          </p>
          <p className="text-base font-bold text-emerald-400 font-mono-num mt-1">
            {stats.peakTx.full}
          </p>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center space-x-1">
            <BarChart2 className="w-3 h-3 text-blue-300" />
            <span>Avg Download</span>
          </p>
          <p className="text-base font-bold text-slate-200 font-mono-num mt-1">
            {stats.avgRx.full}
          </p>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center space-x-1">
            <BarChart2 className="w-3 h-3 text-emerald-300" />
            <span>Avg Upload</span>
          </p>
          <p className="text-base font-bold text-slate-200 font-mono-num mt-1">
            {stats.avgTx.full}
          </p>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-72 sm:h-80 w-full">
        {chartData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
            <p className="text-sm font-medium">No telemetry samples recorded for this time range yet</p>
            <p className="text-xs text-slate-600 mt-1">Samples will accumulate continuously as the poller runs</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="downloadGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="uploadGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />

              <XAxis
                dataKey="timestamp"
                tickFormatter={(ts) => (range === '1h' || range === '24h' ? formatTimeOnly(ts) : formatDateTime(ts))}
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />

              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                unit="M"
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    const dl = formatSpeed(d.rawRxBps);
                    const ul = formatSpeed(d.rawTxBps);

                    return (
                      <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl text-xs space-y-1.5 font-mono-num">
                        <p className="text-slate-400 font-semibold border-b border-slate-800 pb-1">
                          {formatDateTime(d.timestamp)}
                        </p>
                        <div className="flex items-center justify-between space-x-4">
                          <span className="flex items-center space-x-1 text-blue-400">
                            <ArrowDown className="w-3 h-3" />
                            <span>Download:</span>
                          </span>
                          <span className="font-bold text-white">{dl.full}</span>
                        </div>
                        <div className="flex items-center justify-between space-x-4">
                          <span className="flex items-center space-x-1 text-emerald-400">
                            <ArrowUp className="w-3 h-3" />
                            <span>Upload:</span>
                          </span>
                          <span className="font-bold text-white">{ul.full}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Area
                type="monotone"
                dataKey="downloadMbps"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#downloadGrad)"
                name="Download (Mbps)"
              />

              <Area
                type="monotone"
                dataKey="uploadMbps"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#uploadGrad)"
                name="Upload (Mbps)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center space-x-6 text-xs">
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-blue-500"></span>
          <span className="text-slate-300 font-medium">Download Rate</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
          <span className="text-slate-300 font-medium">Upload Rate</span>
        </div>
      </div>
    </div>
  );
};

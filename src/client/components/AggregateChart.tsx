import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { formatSpeed, formatDateTime, formatTimeOnly } from '../lib/format.js';
import { Gauge, Zap, TrendingUp, AlertTriangle } from 'lucide-react';
import type { AggregateDataPoint } from '../../server/types.js';

interface AggregateChartProps {
  data: AggregateDataPoint[];
  capacityMbps: number;
  range: string;
  onRangeChange: (range: string) => void;
  isLoading?: boolean;
}

export const AggregateChart: React.FC<AggregateChartProps> = ({
  data,
  capacityMbps,
  range,
  onRangeChange,
  isLoading = false,
}) => {
  // Aggregate stats
  const stats = useMemo(() => {
    let peakTotalBps = 0;
    let sumTotalBps = 0;
    let maxUtilization = 0;

    for (const point of data) {
      const rx = point.totalRxRateBps || (point.totalRxRate * 8);
      const tx = point.totalTxRateBps || (point.totalTxRate * 8);
      const total = rx + tx;

      if (total > peakTotalBps) peakTotalBps = total;
      if (point.utilizationPercent > maxUtilization) maxUtilization = point.utilizationPercent;

      sumTotalBps += total;
    }

    const count = Math.max(1, data.length);
    const avgTotalBps = Math.round(sumTotalBps / count);

    return {
      peakTotal: formatSpeed(peakTotalBps),
      avgTotal: formatSpeed(avgTotalBps),
      maxUtilization: maxUtilization.toFixed(1),
    };
  }, [data]);

  // Format data points for Recharts
  const chartData = useMemo(() => {
    return data.map((d) => {
      const rxBps = d.totalRxRateBps || (d.totalRxRate * 8);
      const txBps = d.totalTxRateBps || (d.totalTxRate * 8);

      return {
        timestamp: d.timestamp,
        downloadMbps: Number((rxBps / 1_000_000).toFixed(2)),
        uploadMbps: Number((txBps / 1_000_000).toFixed(2)),
        totalMbps: Number(((rxBps + txBps) / 1_000_000).toFixed(2)),
        utilizationPercent: d.utilizationPercent,
        rawRxBps: rxBps,
        rawTxBps: txBps,
      };
    });
  }, [data]);

  const ranges = [
    { id: '1h', label: '1 Hour' },
    { id: '6h', label: '6 Hours' },
    { id: '24h', label: '24 Hours' },
    { id: '7d', label: '7 Days' },
    { id: '30d', label: '30 Days' },
  ];

  return (
    <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-bold text-white tracking-tight">
              Office Aggregate Bandwidth vs ISP Contracted Line
            </h3>
            {isLoading && (
              <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 animate-pulse">
                Loading...
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitoring ISP capacity utilization ({capacityMbps} Mbps) to isolate network bottlenecks
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

      {/* Aggregate Metric Mini-cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center space-x-1">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>Peak Total Traffic</span>
          </p>
          <p className="text-lg font-bold text-white font-mono-num mt-1">
            {stats.peakTotal.full}
          </p>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center space-x-1">
            <TrendingUp className="w-3 h-3 text-blue-400" />
            <span>Avg Total Traffic</span>
          </p>
          <p className="text-lg font-bold text-slate-200 font-mono-num mt-1">
            {stats.avgTotal.full}
          </p>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center space-x-1">
            <Gauge className="w-3 h-3 text-emerald-400" />
            <span>Peak Saturation</span>
          </p>
          <p className="text-lg font-bold text-white font-mono-num mt-1">
            {stats.maxUtilization}% <span className="text-xs text-slate-400">capacity</span>
          </p>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-80 sm:h-96 w-full">
        {chartData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
            <p className="text-sm font-medium">No aggregate network telemetry recorded for this range</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
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
                unit=" Mbps"
                domain={[0, Math.max(capacityMbps * 1.05, 220)]}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    const dl = formatSpeed(d.rawRxBps);
                    const ul = formatSpeed(d.rawTxBps);

                    return (
                      <div className="bg-slate-900 border border-slate-700 p-3.5 rounded-xl shadow-2xl text-xs space-y-2 font-mono-num">
                        <p className="text-slate-400 font-semibold border-b border-slate-800 pb-1">
                          {formatDateTime(d.timestamp)}
                        </p>
                        <div className="flex items-center justify-between space-x-6">
                          <span className="text-indigo-400 font-bold">Total Bandwidth:</span>
                          <span className="font-extrabold text-white">{d.totalMbps} Mbps</span>
                        </div>
                        <div className="flex items-center justify-between space-x-6 text-slate-300">
                          <span className="text-blue-400">Download:</span>
                          <span>{dl.full}</span>
                        </div>
                        <div className="flex items-center justify-between space-x-6 text-slate-300">
                          <span className="text-emerald-400">Upload:</span>
                          <span>{ul.full}</span>
                        </div>
                        <div className="flex items-center justify-between space-x-6 pt-1 border-t border-slate-800">
                          <span className="text-slate-400">ISP Saturation:</span>
                          <span className={`font-bold ${d.utilizationPercent >= 80 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {d.utilizationPercent}%
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* ISP Max Capacity Line */}
              <ReferenceLine
                y={capacityMbps}
                stroke="#ef4444"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: `ISP Capacity (${capacityMbps} Mbps)`,
                  position: 'top',
                  fill: '#ef4444',
                  fontSize: 11,
                  fontWeight: 'bold',
                }}
              />

              {/* Warning Threshold Line (85%) */}
              <ReferenceLine
                y={Math.round(capacityMbps * 0.85)}
                stroke="#f59e0b"
                strokeDasharray="2 2"
                strokeWidth={1}
                label={{
                  value: `Warning Threshold (85% = ${Math.round(capacityMbps * 0.85)} Mbps)`,
                  position: 'insideBottomRight',
                  fill: '#f59e0b',
                  fontSize: 10,
                }}
              />

              <Area
                type="monotone"
                dataKey="totalMbps"
                stroke="#6366f1"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#totalGrad)"
                name="Total Bandwidth (Mbps)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Capacity Alert Banner if Near Saturation */}
      {Number(stats.maxUtilization) >= 85 && (
        <div className="flex items-center space-x-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <div>
            <span className="font-bold">ISP Bandwidth Warning: </span>
            A traffic spike reached {stats.maxUtilization}% capacity. Check Top Bandwidth Consumers on Live Monitor to identify bandwidth-heavy applications.
          </div>
        </div>
      )}
    </div>
  );
};

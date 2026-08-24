import React, { useState, useEffect } from 'react';
import { AggregateChart } from '../components/AggregateChart.js';
import { fetchAggregateHistory } from '../lib/api.js';
import { Network, Info, ShieldCheck } from 'lucide-react';
import type { AggregateDataPoint } from '../../server/types.js';

interface AggregatePageProps {
  capacityMbps: number;
}

export const AggregatePage: React.FC<AggregatePageProps> = ({ capacityMbps }) => {
  const [range, setRange] = useState<string>('1h');
  const [data, setData] = useState<AggregateDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    fetchAggregateHistory(range)
      .then((res) => {
        if (isMounted && res.success) {
          setData(res.data || []);
        }
      })
      .catch((err) => {
        console.error('Failed to load aggregate history:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [range]);

  return (
    <div className="space-y-6">
      {/* Information Header */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-start space-x-3">
          <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 mt-0.5">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              Office Network Aggregate Bandwidth Telemetry
            </h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              This chart aggregates total bandwidth consumption across all active Hotspot clients and correlates it with the contracted ISP line capacity ({capacityMbps} Mbps). Use this visualization to distinguish between ISP saturation bottlenecks and local WiFi Mesh roaming or interference issues.
            </p>
          </div>
        </div>
      </div>

      {/* Aggregate Chart */}
      <AggregateChart
        data={data}
        capacityMbps={capacityMbps}
        range={range}
        onRangeChange={setRange}
        isLoading={isLoading}
      />

      {/* Diagnostic Tips Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-4 text-xs space-y-2">
          <div className="flex items-center space-x-2 text-blue-400 font-bold">
            <Info className="w-4 h-4" />
            <span>When is the ISP line saturated?</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            When aggregate throughput approaches the red line ({capacityMbps} Mbps) or exceeds the yellow 85% threshold, latency increases across all devices. Inspect the Live Monitor to identify top bandwidth consumers.
          </p>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-4 text-xs space-y-2">
          <div className="flex items-center space-x-2 text-emerald-400 font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>When is it a local WiFi Mesh issue?</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            If an individual user experiences slowdowns while total aggregate usage remains well below line capacity (&lt; 50 Mbps), the root cause is typically RF signal degradation or AP node roaming.
          </p>
        </div>
      </div>
    </div>
  );
};

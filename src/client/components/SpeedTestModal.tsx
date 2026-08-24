import React, { useState, useEffect } from 'react';
import { X, Gauge, Zap, Activity, ArrowDown, ArrowUp, CheckCircle, AlertTriangle, Clock, RefreshCw, Server, Wifi } from 'lucide-react';
import { runSpeedTest, fetchSpeedTestHistory, fetchWanLive } from '../lib/api.js';
import { formatSpeed, formatBytes } from '../lib/format.js';
import type { SpeedTestResult, WanInterfaceSample } from '../../server/types.js';

interface SpeedTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  wanLive?: WanInterfaceSample;
}

export const SpeedTestModal: React.FC<SpeedTestModalProps> = ({ isOpen, onClose, wanLive }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentResult, setCurrentResult] = useState<SpeedTestResult | null>(null);
  const [history, setHistory] = useState<SpeedTestResult[]>([]);
  const [testPhase, setTestPhase] = useState<'idle' | 'ping' | 'download' | 'upload' | 'complete'>('idle');
  const [localWan, setLocalWan] = useState<WanInterfaceSample | undefined>(wanLive);

  useEffect(() => {
    if (wanLive) {
      setLocalWan(wanLive);
    }
  }, [wanLive]);

  useEffect(() => {
    if (isOpen) {
      // 1. Fetch speedtest history
      fetchSpeedTestHistory()
        .then((res) => {
          if (res.success && res.history) {
            setHistory(res.history);
            if (res.latest && !currentResult) {
              setCurrentResult(res.latest);
            }
          }
        })
        .catch(console.error);

      // 2. Poll live WAN traffic every 3s while modal is open
      const pollWan = () => {
        fetchWanLive()
          .then((res) => {
            if (res.success && res.wan) {
              setLocalWan(res.wan);
            }
          })
          .catch(console.error);
      };

      pollWan();
      const timer = setInterval(pollWan, 3000);
      return () => clearInterval(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartTest = async () => {
    setIsRunning(true);
    setTestPhase('ping');

    // Simulate smooth UI phase transitions during test
    setTimeout(() => setTestPhase('download'), 800);
    setTimeout(() => setTestPhase('upload'), 3200);

    try {
      const res = await runSpeedTest();
      if (res.success && res.result) {
        setCurrentResult(res.result);
        setHistory((prev) => [res.result, ...prev.filter(h => h.id !== res.result.id)].slice(0, 20));
      }
    } catch (err) {
      console.error('Speedtest failed:', err);
    } finally {
      setIsRunning(false);
      setTestPhase('complete');
    }
  };

  const effectiveWan = localWan || wanLive;
  const wanDownDisplay = formatSpeed(effectiveWan?.rxRateBps || 0);
  const wanUpDisplay = formatSpeed(effectiveWan?.txRateBps || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-400">
              <Gauge className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
                <span>ISP Speed Benchmark & Real-Time Throughput</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold">
                  200 Mbps Capacity
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time WAN interface physical traffic and on-demand line speed benchmark
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* 1. Live WAN Throughput Gauge (Port ether11) */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Real-Time WAN Physical Throughput
                </h4>
              </div>
              <span className="text-[11px] text-slate-500 font-mono-num">
                {effectiveWan?.rxPacketsPerSec || 0} pkt/s in • {effectiveWan?.txPacketsPerSec || 0} pkt/s out
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <ArrowDown className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Live Download</span>
                    <div className="font-mono-num font-extrabold text-white text-base">
                      {wanDownDisplay.value} <span className="text-xs font-semibold text-slate-400">{wanDownDisplay.unit}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                    <ArrowUp className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Live Upload</span>
                    <div className="font-mono-num font-extrabold text-white text-base">
                      {wanUpDisplay.value} <span className="text-xs font-semibold text-slate-400">{wanUpDisplay.unit}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Main Speedtest Benchmark Section */}
          <div className="bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 rounded-3xl p-6 text-center relative overflow-hidden shadow-lg">
            {/* Speed Gauge Display */}
            <div className="max-w-md mx-auto space-y-4">
              <div className="relative w-44 h-44 mx-auto flex items-center justify-center">
                {/* Outer Spinning Border Ring */}
                <div
                  className={`absolute inset-0 rounded-full border-4 ${
                    isRunning
                      ? 'border-blue-500/20 border-t-blue-500 border-r-indigo-500 animate-spin'
                      : 'border-slate-800'
                  }`}
                  style={{ animationDuration: '1.2s' }}
                />

                {/* Static Inner Content (Does NOT rotate) */}
                <div className="w-36 h-36 rounded-full bg-slate-950 border border-slate-800 flex flex-col items-center justify-center p-3 shadow-inner z-10 select-none">
                  {isRunning ? (
                    <div className="space-y-1.5 text-center">
                      <Activity className="w-6 h-6 text-blue-400 animate-pulse mx-auto" />
                      <div className="text-xs font-extrabold text-white uppercase tracking-wider">
                        {testPhase === 'ping' && 'Testing Latency...'}
                        {testPhase === 'download' && 'Testing Download...'}
                        {testPhase === 'upload' && 'Testing Upload...'}
                      </div>
                      <div className="text-[10px] text-blue-400 font-semibold animate-pulse">
                        Please wait
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-0.5 text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Download</span>
                      <div className="text-3xl font-extrabold text-white font-mono-num">
                        {currentResult?.downloadMbps || '--'}
                      </div>
                      <span className="text-[11px] font-semibold text-blue-400">Mbps</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Start Test Button */}
              <div>
                <button
                  onClick={handleStartTest}
                  disabled={isRunning}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-sm shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 flex items-center space-x-2 mx-auto"
                >
                  <Zap className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
                  <span>{isRunning ? 'Running Benchmark...' : 'Start ISP Speed Test'}</span>
                </button>
              </div>

              {/* Benchmark Result Cards (Ping, Jitter, Download, Upload) */}
              <div className="grid grid-cols-4 gap-2 pt-2 text-left">
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-medium">Ping</span>
                  <div className="text-base font-bold text-white font-mono-num mt-0.5">
                    {currentResult?.pingMs ?? '--'} <span className="text-[10px] text-slate-500 font-normal">ms</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-medium">Jitter</span>
                  <div className="text-base font-bold text-white font-mono-num mt-0.5">
                    {currentResult?.jitterMs ?? '--'} <span className="text-[10px] text-slate-500 font-normal">ms</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] text-emerald-400 font-medium">Download</span>
                  <div className="text-base font-bold text-emerald-400 font-mono-num mt-0.5 truncate">
                    {currentResult?.downloadMbps ?? '--'} <span className="text-[10px] text-slate-500 font-normal">Mbps</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] text-blue-400 font-medium">Upload</span>
                  <div className="text-base font-bold text-blue-400 font-mono-num mt-0.5 truncate">
                    {currentResult?.uploadMbps ?? '--'} <span className="text-[10px] text-slate-500 font-normal">Mbps</span>
                  </div>
                </div>
              </div>

              {/* ISP Quality Verdict Banner */}
              {currentResult && (
                <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                  currentResult.qualityRating === 'excellent'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    : currentResult.qualityRating === 'good'
                    ? 'bg-blue-500/10 border-blue-500/20 text-blue-300'
                    : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                }`}>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>
                      ISP Delivery Rate: <strong>{currentResult.ispDeliveryPercent}%</strong> of contracted capacity ({currentResult.capacityMbps} Mbps)
                    </span>
                  </div>
                  <span className="uppercase font-extrabold text-[10px] px-2 py-0.5 rounded bg-slate-950/60 border border-current">
                    {currentResult.qualityRating}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 3. Speedtest Audit History Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Previous Speed Test History</span>
            </h4>

            <div className="border border-slate-800 rounded-xl overflow-hidden overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Download</th>
                    <th className="py-2.5 px-3">Upload</th>
                    <th className="py-2.5 px-3">Ping & Jitter</th>
                    <th className="py-2.5 px-3 text-right">Delivery Ratio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono-num">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">
                        No speed test history recorded yet
                      </td>
                    </tr>
                  ) : (
                    history.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3 text-slate-300 font-sans font-medium">{h.timeStr}</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-bold">{h.downloadMbps} Mbps</td>
                        <td className="py-2.5 px-3 text-blue-400 font-bold">{h.uploadMbps} Mbps</td>
                        <td className="py-2.5 px-3 text-slate-400">{h.pingMs} ms (±{h.jitterMs} ms)</td>
                        <td className="py-2.5 px-3 text-right font-sans">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase">
                            {h.ispDeliveryPercent}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <Server className="w-3.5 h-3.5 text-blue-400" />
            <span>Target Node: <strong>ISP Edge / Jakarta Node</strong></span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

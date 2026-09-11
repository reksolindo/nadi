import React, { useState } from 'react';
import {
  X,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  Server,
  Radio,
  Globe,
  ArrowRight,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import type { IspHealthStatus } from '../../server/types.js';

interface IspHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  health?: IspHealthStatus;
  capacityMbps: number;
  onRefresh?: () => Promise<void>;
}

export const IspHealthModal: React.FC<IspHealthModalProps> = ({
  isOpen,
  onClose,
  health,
  capacityMbps,
  onRefresh,
}) => {
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!health?.disputeTemplate) return;
    navigator.clipboard.writeText(health.disputeTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleManualRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const isDegraded = (health?.packetLossPercent || 0) >= 5 || (health?.latencyMs || 0) >= 60;
  const isCritical = (health?.packetLossPercent || 0) >= 20 || (health?.latencyMs || 0) >= 150;

  const hop1 = health?.hops?.find(h => h.hopNumber === 1);
  const hop2 = health?.hops?.find(h => h.hopNumber === 2);
  const hop3 = health?.hops?.find(h => h.hopNumber === 3);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl border ${
              isCritical
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : isDegraded
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}>
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">
                  ISP SLA Barometer & Dispute Evidence
                </h3>
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                  isCritical
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                    : isDegraded
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}>
                  {isCritical ? 'Critical Degradation' : isDegraded ? 'Degraded SLA' : 'Healthy SLA'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Buktikan status transmisi ISP dan patahkan dalih "lampu modem hijau" dengan bukti telemetri
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            {onRefresh && (
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                title="Uji ulang diagnostik"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-slate-200">

          {/* 1. Verdict Diagnosis Alert Banner */}
          <div className={`p-4 rounded-2xl border flex items-start space-x-3.5 ${
            isCritical
              ? 'bg-rose-950/40 border-rose-800/80 text-rose-200'
              : isDegraded
              ? 'bg-amber-950/40 border-amber-800/80 text-amber-200'
              : 'bg-emerald-950/30 border-emerald-800/70 text-emerald-200'
          }`}>
            <div className="mt-0.5">
              {isCritical ? (
                <ShieldAlert className="w-5 h-5 text-rose-400" />
              ) : isDegraded ? (
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              )}
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider">
                Analisis Diagnostik Otomatis NADI:
              </h4>
              <p className="text-xs leading-relaxed opacity-95">
                {health?.diagnosis || 'Sedang mengukur latensi dan packet loss multi-hop...'}
              </p>
              <p className="text-[11px] font-semibold opacity-80 pt-0.5">
                Rekomendasi: {health?.suggestedAction}
              </p>
            </div>
          </div>

          {/* 2. Visual Multi-Hop Link Path Analysis */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
              <span>Multi-Hop Responsibility Split (Lokal vs ISP)</span>
              <span className="text-[10px] text-slate-400 font-mono-num font-normal">
                Kontrak: {capacityMbps} Mbps • Gateway: {health?.wanIp || '192.168.18.207'}
              </span>
            </h4>

            {/* Visual Hop Flow */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              {/* Hop 1: Router to Modem */}
              <div className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-2.5 ${
                (hop1?.packetLossPercent || 0) > 5
                  ? 'bg-rose-950/30 border-rose-800/80'
                  : 'bg-slate-900/90 border-slate-800'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Server className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-white">Hop 1: Modem Lokal</span>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    (hop1?.packetLossPercent || 0) === 0
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {hop1?.packetLossPercent || 0}% Loss
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="text-[11px] text-slate-400 font-mono-num">
                    Target: {hop1?.target || '192.168.18.1'}
                  </div>
                  <div className="text-sm font-extrabold text-white font-mono-num">
                    {hop1?.avgLatencyMs || 1} ms <span className="text-xs font-normal text-slate-400">RTT</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Segmen LAN kantor (Kabel UTP normal)
                  </div>
                </div>
              </div>

              {/* Hop 2: Modem to ISP Gateway */}
              <div className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-2.5 ${
                (hop2?.packetLossPercent || 0) >= 10
                  ? 'bg-rose-950/40 border-rose-500/80 ring-1 ring-rose-500/50'
                  : (hop2?.packetLossPercent || 0) >= 5
                  ? 'bg-amber-950/30 border-amber-500/80'
                  : 'bg-slate-900/90 border-slate-800'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Radio className="w-4 h-4 text-orange-400" />
                    <span className="text-xs font-bold text-white">Hop 2: ISP Upstream</span>
                  </div>
                  <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                    (hop2?.packetLossPercent || 0) >= 10
                      ? 'bg-rose-500 text-white animate-pulse'
                      : (hop2?.packetLossPercent || 0) > 0
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {hop2?.packetLossPercent || 0}% Loss
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="text-[11px] text-slate-400 font-mono-num">
                    Target: {hop2?.target || '1.1.1.1'} (Peering)
                  </div>
                  <div className={`text-sm font-extrabold font-mono-num ${
                    (hop2?.avgLatencyMs || 0) > 60 ? 'text-rose-400' : 'text-white'
                  }`}>
                    {hop2?.avgLatencyMs || 15} ms <span className="text-xs font-normal text-slate-400">RTT</span>
                  </div>
                  <div className={`text-[10px] ${
                    (hop2?.packetLossPercent || 0) >= 10 ? 'text-rose-300 font-semibold' : 'text-slate-400'
                  }`}>
                    {(hop2?.packetLossPercent || 0) >= 10
                      ? '⚠️ TITIK MASALAH: Jalur OLT / Core ISP drop!'
                      : 'Transmisi fiber optik & peering ISP'}
                  </div>
                </div>
              </div>

              {/* Hop 3: Global Core Internet */}
              <div className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-2.5 ${
                (hop3?.packetLossPercent || 0) >= 10
                  ? 'bg-rose-950/30 border-rose-800/80'
                  : 'bg-slate-900/90 border-slate-800'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-white">Hop 3: Global Internet</span>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    (hop3?.packetLossPercent || 0) === 0
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {hop3?.packetLossPercent || 0}% Loss
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="text-[11px] text-slate-400 font-mono-num">
                    Target: {hop3?.target || '8.8.8.8'} (Transit)
                  </div>
                  <div className="text-sm font-extrabold text-white font-mono-num">
                    {hop3?.avgLatencyMs || 20} ms <span className="text-xs font-normal text-slate-400">RTT</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Koneksi backbone global & interkoneksi
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. SLA Telemetry Metric Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                Upstream Packet Loss
              </span>
              <div className={`text-xl font-extrabold font-mono-num mt-1 ${
                (health?.packetLossPercent || 0) >= 10
                  ? 'text-rose-400'
                  : (health?.packetLossPercent || 0) > 0
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}>
                {health?.packetLossPercent || 0}%
              </div>
              <span className="text-[10px] text-slate-500">SLA Max: 1.0%</span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                RTT Latency
              </span>
              <div className={`text-xl font-extrabold font-mono-num mt-1 ${
                (health?.latencyMs || 0) > 80
                  ? 'text-rose-400'
                  : (health?.latencyMs || 0) > 40
                  ? 'text-amber-400'
                  : 'text-white'
              }`}>
                {health?.latencyMs || 0} <span className="text-xs text-slate-400">ms</span>
              </div>
              <span className="text-[10px] text-slate-500">Normal: 5 - 20 ms</span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                Jitter Variance
              </span>
              <div className={`text-xl font-extrabold font-mono-num mt-1 ${
                (health?.jitterMs || 0) > 50
                  ? 'text-rose-400'
                  : (health?.jitterMs || 0) > 20
                  ? 'text-amber-400'
                  : 'text-white'
              }`}>
                {health?.jitterMs || 0} <span className="text-xs text-slate-400">ms</span>
              </div>
              <span className="text-[10px] text-slate-500">Kestabilan panggilan</span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                DNS Resolve Speed
              </span>
              <div className={`text-xl font-extrabold font-mono-num mt-1 ${
                (health?.dnsResolutionMs || 0) > 200
                  ? 'text-rose-400'
                  : 'text-white'
              }`}>
                {health?.dnsResolutionMs || 0} <span className="text-xs text-slate-400">ms</span>
              </div>
              <span className="text-[10px] text-slate-500">Kecepatan lookup web</span>
            </div>
          </div>

          {/* 4. One-Click Copy Dispute Complaint Template */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Copy className="w-4 h-4 text-blue-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Format Komplain Resmi ke ISP (Siap Kirim via WA / Tiket)
                </h4>
              </div>
              <button
                onClick={handleCopy}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  copied
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Tersalin ke Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Format Komplain</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-3.5 bg-slate-900 border border-slate-800/80 rounded-xl text-[11px] font-mono-num text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed select-all">
              {health?.disputeTemplate || 'Memuat template komplain...'}
            </pre>
            <p className="text-[11px] text-slate-500">
              💡 <strong>Tips:</strong> Lampirkan teks di atas saat chat WhatsApp Account Manager atau buka tiket kendala ke ISP untuk mematahkan alasan "lampu modem hijau".
            </p>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-all"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};

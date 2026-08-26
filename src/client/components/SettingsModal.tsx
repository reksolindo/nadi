import React, { useState, useEffect } from 'react';
import { X, Sliders, Check, RefreshCw, AlertCircle, HardDrive, Wifi, Sparkles } from 'lucide-react';
import { fetchConfig, updateConfig } from '../lib/api.js';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated?: (newCapacity: number) => void;
  currentCapacity?: number;
}

const PRESET_CAPACITIES = [50, 100, 150, 200, 300, 500, 1000];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdated,
  currentCapacity = 200,
}) => {
  const [capacity, setCapacity] = useState<number>(currentCapacity);
  const [routerLabel, setRouterLabel] = useState<string>('Gateway Router (Jakarta)');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setStatusMessage(null);
      fetchConfig()
        .then((res) => {
          if (res.success) {
            setCapacity(res.capacityMbps);
            if (res.settings?.router_label) {
              setRouterLabel(res.settings.router_label);
            }
          }
        })
        .catch(() => {
          setCapacity(currentCapacity);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, currentCapacity]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (capacity <= 0 || capacity > 100000) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid bandwidth capacity (1 - 100,000 Mbps).' });
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);
    try {
      const res = await updateConfig({
        capacityMbps: capacity,
        routerLabel: routerLabel.trim(),
      });
      if (res.success) {
        setStatusMessage({ type: 'success', text: `ISP capacity updated to ${res.capacityMbps} Mbps in real-time!` });
        if (onConfigUpdated) {
          onConfigUpdated(res.capacityMbps);
        }
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to update configuration.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Network & ISP Configuration</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold uppercase">
                  Runtime
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure ISP contract speed and telemetry parameters dynamically
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

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          {isLoading ? (
            <div className="py-12 text-center space-y-3">
              <RefreshCw className="w-7 h-7 text-blue-500 animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Loading current configuration from database...</p>
            </div>
          ) : (
            <>
              {statusMessage && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-center space-x-2.5 ${
                    statusMessage.type === 'success'
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                  }`}
                >
                  {statusMessage.type === 'success' ? (
                    <Check className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span>{statusMessage.text}</span>
                </div>
              )}

              {/* ISP Bandwidth Capacity Configuration */}
              <div className="space-y-3 bg-slate-950/50 p-4 rounded-2xl border border-slate-800/80">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                    <Wifi className="w-4 h-4 text-blue-400" />
                    <span>ISP Contract Capacity (Mbps)</span>
                  </label>
                  <span className="text-xs font-mono font-bold text-blue-400">
                    {capacity} Mbps
                  </span>
                </div>

                <p className="text-[11px] text-slate-400">
                  Used as the 100% reference line on WAN saturation charts, speed test SLA benchmarks, and bottleneck alerts.
                </p>

                {/* Quick Presets */}
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {PRESET_CAPACITIES.map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCapacity(val)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold font-mono-num transition-all ${
                        capacity === val
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-500'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                      }`}
                    >
                      {val >= 1000 ? `${val / 1000} Gbps` : `${val}M`}
                    </button>
                  ))}
                </div>

                {/* Custom Input */}
                <div className="pt-2">
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      max={100000}
                      value={capacity}
                      onChange={(e) => setCapacity(parseInt(e.target.value, 10) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="Custom capacity in Mbps..."
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-semibold font-mono">
                      Mbps
                    </span>
                  </div>
                </div>
              </div>

              {/* Router Identity / Location Label */}
              <div className="space-y-3 bg-slate-950/50 p-4 rounded-2xl border border-slate-800/80">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                  <HardDrive className="w-4 h-4 text-emerald-400" />
                  <span>Router Node Identity / Label</span>
                </label>
                <input
                  type="text"
                  value={routerLabel}
                  onChange={(e) => setRouterLabel(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-xs font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  placeholder="e.g. Gateway Router (Jakarta)"
                />
                <p className="text-[11px] text-slate-400">
                  Displayed on the Live Threat Map and diagnostics reports.
                </p>
              </div>

              {/* Open Source / License Info Badge */}
              <div className="p-3.5 rounded-xl bg-slate-950/30 border border-slate-800 text-[11px] text-slate-400 flex items-center space-x-2.5">
                <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>
                  Licensed under <strong>GNU General Public License v3.0 (GPL-3.0)</strong>. Changes persist in SQLite database.
                </span>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-end space-x-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center space-x-1.5 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Applying...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

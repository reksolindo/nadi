import React from 'react';
import { Wifi, LineChart, BarChart3, ShieldAlert, Server } from 'lucide-react';

interface MobileNavProps {
  currentTab: 'live' | 'history' | 'aggregate' | 'security' | 'diagnostics';
  onSelectTab: (tab: 'live' | 'history' | 'aggregate' | 'security' | 'diagnostics') => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentTab,
  onSelectTab,
}) => {
  const tabs = [
    { id: 'live', label: 'Live', icon: Wifi },
    { id: 'history', label: 'History', icon: LineChart },
    { id: 'aggregate', label: 'Aggregates', icon: BarChart3 },
    { id: 'security', label: 'Security', icon: ShieldAlert },
    { id: 'diagnostics', label: 'Diag', icon: Server },
  ] as const;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/80 px-2 py-1.5 shadow-2xl safe-area-bottom">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => {
                onSelectTab(tab.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all ${
                isActive
                  ? 'text-blue-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-all ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/40 shadow-sm'
                    : 'bg-transparent text-slate-400'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

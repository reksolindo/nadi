import React, { useState } from 'react';
import { useWebSocket } from './hooks/useWebSocket.js';
import { Header } from './components/Header.js';
import { MobileNav } from './components/MobileNav.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { HistoryPage } from './pages/HistoryPage.js';
import { AggregatePage } from './pages/AggregatePage.js';
import { SecurityPage } from './pages/SecurityPage.js';
import { DiagnosticsPage } from './pages/DiagnosticsPage.js';
import { TrafficInspectorModal } from './components/TrafficInspectorModal.js';
import { SpeedTestModal } from './components/SpeedTestModal.js';
import { SettingsModal } from './components/SettingsModal.js';
import { IspHealthModal } from './components/IspHealthModal.js';
import { refreshIspHealth } from './lib/api.js';
import { HeartPulse } from 'lucide-react';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<'live' | 'history' | 'aggregate' | 'security' | 'diagnostics'>('live');
  const [selectedHistoryUser, setSelectedHistoryUser] = useState<string>('');
  const [inspectingUser, setInspectingUser] = useState<{ ip: string; username?: string } | null>(null);
  const [isSpeedTestOpen, setIsSpeedTestOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isIspHealthOpen, setIsIspHealthOpen] = useState<boolean>(false);

  const {
    connected: wsConnected,
    lastUpdated,
    summary,
    users,
    routerConnected,
    routerError,
  } = useWebSocket();

  const handleSelectUser = (username: string) => {
    setSelectedHistoryUser(username);
    setCurrentTab('history');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleInspectTraffic = (ip: string, username?: string) => {
    setInspectingUser({ ip, username });
  };

  const capacityMbps = summary?.capacityMbps || 200;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white pb-16 md:pb-0">
      {/* Header Bar */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        wsConnected={wsConnected}
        routerConnected={routerConnected}
        routerError={routerError}
        lastUpdated={lastUpdated}
        capacityMbps={capacityMbps}
        ispHealth={summary?.ispHealth}
        onOpenSpeedTest={() => setIsSpeedTestOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenIspHealth={() => setIsIspHealthOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {currentTab === 'live' && (
          <DashboardPage
            summary={summary}
            users={users}
            onSelectUser={handleSelectUser}
            onInspectTraffic={handleInspectTraffic}
            onOpenSpeedTest={() => setIsSpeedTestOpen(true)}
          />
        )}

        {currentTab === 'history' && (
          <HistoryPage
            initialUsername={selectedHistoryUser}
            activeUsers={users}
          />
        )}

        {currentTab === 'aggregate' && (
          <AggregatePage capacityMbps={capacityMbps} />
        )}

        {currentTab === 'security' && <SecurityPage />}

        {currentTab === 'diagnostics' && <DiagnosticsPage />}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <MobileNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentCapacity={capacityMbps}
      />

      {/* Traffic Inspector Modal */}
      {inspectingUser && (
        <TrafficInspectorModal
          userIp={inspectingUser.ip}
          username={inspectingUser.username}
          onClose={() => setInspectingUser(null)}
        />
      )}

      {/* Speed Test Modal */}
      <SpeedTestModal
        isOpen={isSpeedTestOpen}
        onClose={() => setIsSpeedTestOpen(false)}
        wanLive={summary?.wanInterface}
        capacityMbps={capacityMbps}
      />

      {/* ISP SLA & Dispute Barometer Modal */}
      <IspHealthModal
        isOpen={isIspHealthOpen}
        onClose={() => setIsIspHealthOpen(false)}
        health={summary?.ispHealth}
        capacityMbps={capacityMbps}
        onRefresh={async () => {
          const res = await refreshIspHealth();
          if (res.success && res.health && summary) {
            summary.ispHealth = res.health;
          }
        }}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 mt-auto hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <div className="flex items-center space-x-2">
            <HeartPulse className="w-4 h-4 text-blue-500" />
            <span className="font-semibold text-slate-300">NADI</span>
            <span>— Network Activity & Data Insight</span>
          </div>
          <div>
            <span>GNU GPL v3.0 Open Source Platform for MikroTik RouterOS</span>
          </div>
        </div>
      </footer>
    </div>
  );
};


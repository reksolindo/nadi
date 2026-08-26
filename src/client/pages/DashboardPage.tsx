import React from 'react';
import { SummaryCards } from '../components/SummaryCards.js';
import { TopConsumerCard } from '../components/TopConsumerCard.js';
import { LiveDestinationBreakdown } from '../components/LiveDestinationBreakdown.js';
import { LiveTable } from '../components/LiveTable.js';
import type { UserBandwidthSample, NetworkSummary } from '../../server/types.js';

interface DashboardPageProps {
  summary: NetworkSummary | null;
  users: UserBandwidthSample[];
  onSelectUser: (username: string) => void;
  onInspectTraffic?: (ip: string, username?: string) => void;
  onOpenSpeedTest?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  summary,
  users,
  onSelectUser,
  onInspectTraffic,
  onOpenSpeedTest,
}) => {
  return (
    <div className="space-y-4 sm:space-y-6 pb-12 md:pb-0">
      {/* 1. Network Summary Metrics */}
      <SummaryCards summary={summary} onOpenSpeedTest={onOpenSpeedTest} />

      {/* 2. Real-Time Destination Breakdown (Where is bandwidth going?) */}
      <LiveDestinationBreakdown
        destinations={summary?.liveDestinations}
        totalRxRateBps={summary?.totalRxRateBps}
        totalTxRateBps={summary?.totalTxRateBps}
        capacityMbps={summary?.capacityMbps}
      />

      {/* 3. Top Consumer Highlight */}
      <TopConsumerCard
        topConsumer={summary?.topConsumer}
        totalRxRateBps={summary?.totalRxRateBps}
        onViewHistory={onSelectUser}
        onInspectTraffic={onInspectTraffic}
      />

      {/* 4. Realtime User Table */}
      <LiveTable
        users={users}
        topUsername={summary?.topConsumer?.username}
        onSelectUser={onSelectUser}
        onInspectTraffic={onInspectTraffic}
      />
    </div>
  );
};


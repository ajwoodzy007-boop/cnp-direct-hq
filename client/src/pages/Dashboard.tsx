import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import MarketRadar from '@/components/MarketRadar';
import TheOracle from '@/components/TheOracle';

const ComingSoon = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
    <h2 className="text-2xl font-bold text-slate-400">{title}</h2>
    <p>Module Initializing...</p>
  </div>
);

export default function Dashboard() {
  const [currentTab, setTab] = useState('radar');

  const renderContent = () => {
    switch (currentTab) {
      case 'radar':
        return <MarketRadar />;
      case 'oracle':
        return <TheOracle />;
      case 'strategist':
        return <ComingSoon title="The Strategist (AI Playbook)" />;
      case 'vault':
        return <ComingSoon title="The Vault (Portfolio)" />;
      case 'academy':
        return <ComingSoon title="The Academy (Education)" />;
      default:
        return <MarketRadar />;
    }
  };

  return (
    <AppLayout currentTab={currentTab} setTab={setTab}>
      {renderContent()}
    </AppLayout>
  );
}

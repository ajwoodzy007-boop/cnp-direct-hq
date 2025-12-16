import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import MarketRadar from '@/components/MarketRadar';
import TheOracle from '@/components/TheOracle';
import TheStrategist from '@/components/TheStrategist';
import TheVault from '@/components/TheVault';
import TheAcademy from '@/components/TheAcademy';

export default function Dashboard() {
  const [currentTab, setTab] = useState('radar');

  const renderContent = () => {
    switch (currentTab) {
      case 'radar':
        return <MarketRadar />;
      case 'oracle':
        return <TheOracle />;
      case 'strategist':
        return <TheStrategist />;
      case 'vault':
        return <TheVault />;
      case 'academy':
        return <TheAcademy />;
      default:
        return <MarketRadar />;
    }
  };

  return (
    <AppLayout 
      currentTab={currentTab} 
      setTab={setTab}
      user={null}
      onLoginClick={() => {}}
      onLogoutClick={() => {}}
      onLegalClick={() => {}}
    >
      {renderContent()}
    </AppLayout>
  );
}

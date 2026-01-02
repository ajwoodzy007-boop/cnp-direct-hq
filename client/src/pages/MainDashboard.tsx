import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import MarketRadar from '@/components/MarketRadar';
import TheOracle from '@/components/TheOracle';
import TheStrategist from '@/components/TheStrategist';
import TheVault from '@/pages/TheVault';
import Profile from '@/pages/Profile';
import Portfolio from '@/pages/Portfolio';
import TheAcademy from '@/components/TheAcademy';
import TheSummary from '@/components/TheSummary';
import PremiumLock from '@/components/PremiumLock';
import AuthLock from '@/components/AuthLock';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { hasPremiumAccess, isAdmin } from '@/lib/permissions';

export default function MainDashboard() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [currentTab, setTab] = useState('summary'); // Default to Command Center

  // Handle navigation to admin panel
  const handleAdminClick = () => {
    setLocation('/admin');
  };

  const handleNavClick = (tabId: string) => {
    setTab(tabId);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const renderContent = () => {
    switch (currentTab) {
      // Public tabs (guests allowed)
      case 'summary':
        return <TheSummary onNavigate={handleNavClick} user={user} />;
      case 'radar':
        return <MarketRadar />;
      case 'academy':
        return <TheAcademy />;

      // Premium tabs (require premium or admin)
      case 'oracle':
        if (!user) {
          return <AuthLock featureName="The Oracle" onLoginClick={() => setLocation('/auth')} />;
        }
        if (!hasPremiumAccess(user)) {
          return <PremiumLock featureName="The Oracle" />;
        }
        return <TheOracle />;

      case 'strategist':
        if (!user) {
          return <AuthLock featureName="The Strategist" onLoginClick={() => setLocation('/auth')} />;
        }
        if (!hasPremiumAccess(user)) {
          return <PremiumLock featureName="The Strategist" />;
        }
        return <TheStrategist />;

      case 'vault':
        // Vault requires login but not necessarily premium
        if (!user) {
          return <AuthLock featureName="The Vault" onLoginClick={() => setLocation('/auth')} />;
        }
        return <TheVault />;

      case 'portfolio':
        if (!user) {
          return <AuthLock featureName="Portfolio" onLoginClick={() => setLocation('/auth')} />;
        }
        return <Portfolio />;

      case 'profile':
        if (!user) {
          return <AuthLock featureName="Profile" onLoginClick={() => setLocation('/auth')} />;
        }
        return <Profile />;

      default:
        return <TheSummary onNavigate={handleNavClick} user={user} />;
    }
  };

  return (
    <AppLayout
      currentTab={currentTab}
      setTab={setTab}
      user={user}
      onLoginClick={() => setLocation('/auth')}
      onLogoutClick={handleLogout}
      onLegalClick={(page) => {
        // Handle legal pages if needed
        console.log('Legal page:', page);
      }}
      onAdminClick={user && isAdmin(user) ? handleAdminClick : undefined}
    >
      {renderContent()}
    </AppLayout>
  );
}


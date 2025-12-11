import React, { useState, useEffect } from 'react';
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SettingsProvider } from "@/contexts/SettingsContext";
import AppLayout from './components/AppLayout';
import MarketRadar from './components/MarketRadar';
import TheOracle from './components/TheOracle';
import TheStrategist from './components/TheStrategist';
import TheVault from './components/TheVault';
import TheAcademy from './components/TheAcademy';
import AuthPage from './components/AuthPage';
import AuthLock from './components/AuthLock';
import PremiumLock from './components/PremiumLock';
import LegalPage from './components/LegalPage';
import Pricing from "@/pages/Pricing";
import CheckoutSuccess from "@/pages/CheckoutSuccess";
import CheckoutCancel from "@/pages/CheckoutCancel";

interface User {
  id: number;
  email: string;
  tier: 'FREE' | 'PREMIUM';
}

function MainDashboard() {
  const [currentTab, setTab] = useState('radar');
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [legalPage, setLegalPage] = useState<'terms' | 'privacy' | 'risk' | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(json => {
        if (json.authenticated) setUser(json.user);
        setLoadingUser(false);
      })
      .catch(() => setLoadingUser(false));
  }, []);

  const handleLogout = () => {
    fetch('/api/auth/logout', { method: 'POST' }).then(() => {
      setUser(null);
      setTab('radar');
    });
  };

  const renderContent = () => {
    switch (currentTab) {
      case 'radar': 
        return <MarketRadar />;
      case 'academy': 
        return <TheAcademy />;
      case 'oracle': 
        if (!user) return (
          <AuthLock 
            featureName="The Oracle" 
            description="uses AI to identify high-probability daily setups. Sign up for free to view today's top conviction picks."
            onLoginClick={() => setShowAuthModal(true)} 
          />
        );
        if (user.tier !== 'PREMIUM') return <PremiumLock featureName="The Oracle" />;
        return <TheOracle />;
      case 'strategist': 
        if (!user) return (
          <AuthLock 
            featureName="The Strategist" 
            description="generates institutional-grade option plays (Calls/Puts) based on volatility. Create an account to run the algorithms."
            onLoginClick={() => setShowAuthModal(true)} 
          />
        );
        if (user.tier !== 'PREMIUM') return <PremiumLock featureName="The Strategist" />;
        return <TheStrategist />;
      case 'vault': 
        if (!user) return (
          <AuthLock 
            featureName="The Vault" 
            description="is your secure paper-trading journal. You must be logged in to save your trade history and track performance."
            onLoginClick={() => setShowAuthModal(true)} 
          />
        );
        return <TheVault />;
      default: return <MarketRadar />;
    }
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-cyan-500 animate-pulse font-mono text-sm">Initializing Sentinel OS...</div>
      </div>
    );
  }

  if (legalPage) {
    return (
      <div className="min-h-screen bg-slate-950 p-4">
        <LegalPage page={legalPage} onBack={() => setLegalPage(null)} />
      </div>
    );
  }

  if (showAuthModal) {
    return (
      <div className="relative">
        <div className="absolute inset-0 filter blur-sm h-screen overflow-hidden">
          <AppLayout 
            currentTab={currentTab} 
            setTab={() => {}}
            user={user} 
            onLoginClick={() => {}} 
            onLogoutClick={() => {}}
          >
            {renderContent()}
          </AppLayout>
        </div>
        <div className="absolute inset-0 z-50">
          <AuthPage 
            onLogin={(u) => {
              setUser(u);
              setShowAuthModal(false);
            }} 
          />
          <button 
            onClick={() => setShowAuthModal(false)}
            className="absolute top-4 right-4 text-slate-400 hover:text-white font-bold text-sm bg-slate-800/80 px-4 py-2 rounded-lg"
            data-testid="button-close-auth"
          >
            Continue as Guest
          </button>
        </div>
      </div>
    );
  }

  return (
    <AppLayout 
      currentTab={currentTab} 
      setTab={setTab} 
      user={user}
      onLoginClick={() => setShowAuthModal(true)}
      onLogoutClick={handleLogout}
      onLegalClick={setLegalPage}
    >
      {renderContent()}
    </AppLayout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <TooltipProvider>
          <Toaster />
          <SonnerToaster position="top-right" richColors />
          <Switch>
            <Route path="/" component={MainDashboard} />
            <Route path="/pricing" component={Pricing} />
            <Route path="/checkout/success" component={CheckoutSuccess} />
            <Route path="/checkout/cancel" component={CheckoutCancel} />
            <Route component={MainDashboard} />
          </Switch>
        </TooltipProvider>
      </SettingsProvider>
    </QueryClientProvider>
  );
}

import React, { useState, useEffect } from 'react';
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SettingsProvider } from "@/contexts/SettingsContext";
import AppLayout from './components/AppLayout';
import AuthPage from './components/AuthPage';
import AuthLock from './components/AuthLock';
import PremiumLock from './components/PremiumLock';
import LegalPage from './components/LegalPage';
import MarketRadar from './components/MarketRadar';
import TheOracle from './components/TheOracle';
import TheStrategist from './components/TheStrategist';
import TheVault from './components/TheVault';
import TheAcademy from './components/TheAcademy';
import TheSummary from './components/TheSummary';
import SettingsModal from './components/SettingsModal';
import Pricing from "@/pages/Pricing";
import CheckoutSuccess from "@/pages/CheckoutSuccess";
import CheckoutCancel from "@/pages/CheckoutCancel";
import AiAssistant from './components/AiAssistant';
import AdminDashboard from './components/AdminDashboard';

function MainDashboard() {
  const [currentTab, setTab] = useState('summary');
  const [user, setUser] = useState<{ email: string; tier: string } | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [legalPage, setLegalPage] = useState<'terms' | 'privacy' | 'risk' | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(json => {
        if (json.authenticated) setUser(json.user);
        setLoadingUser(false);
      })
      .catch(() => setLoadingUser(false));
  }, []);

  useEffect(() => {
    if (user) {
      fetch('/api/admin/check')
        .then(res => res.json())
        .then(json => setIsAdmin(json.isAdmin))
        .catch(() => setIsAdmin(false));
    }
  }, [user]);

  const handleLogout = () => {
    fetch('/api/auth/logout', { method: 'POST' }).then(() => {
      setUser(null);
      setTab('summary');
    });
  };

  const renderContent = () => {
    switch (currentTab) {
      case 'summary': return <TheSummary onNavigate={setTab} />;
      case 'radar': return <MarketRadar />;
      case 'academy': return <TheAcademy />;
      case 'oracle': 
        if (!user) return <AuthLock featureName="The Oracle" description="identifies high-conviction daily setups using AI sentiment analysis. Create a free account to see today's top 3 buy signals." onLoginClick={() => setShowAuthModal(true)} />;
        if (user.tier !== 'PREMIUM') return <PremiumLock featureName="The Oracle" />;
        return <TheOracle />;
      case 'strategist': 
        if (!user) return <AuthLock featureName="The Strategist" description="calculates the perfect Option Greeks and strike prices for any stock. Log in to generate institutional-grade trade plans instantly." onLoginClick={() => setShowAuthModal(true)} />;
        if (user.tier !== 'PREMIUM') return <PremiumLock featureName="The Strategist" />;
        return <TheStrategist />;
      case 'vault': 
        if (!user) return <AuthLock featureName="The Vault" description="is your secure trading journal. You must be logged in to save your trade history, track your P&L, and analyze your win rate." onLoginClick={() => setShowAuthModal(true)} />;
        return <TheVault />;
      default: return <TheSummary onNavigate={setTab} />;
    }
  };

  if (loadingUser) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-cyan-500 animate-pulse font-mono text-sm">Initializing Sentinel OS...</div>;

  if (showAdmin && isAdmin) {
    return <AdminDashboard onBack={() => setShowAdmin(false)} />;
  }

  if (legalPage) {
    return <LegalPage page={legalPage} onBack={() => setLegalPage(null)} />;
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
             onLegalClick={() => {}}
           >
             {renderContent()}
           </AppLayout>
        </div>
        <div className="absolute inset-0 z-50">
          <AuthPage onLogin={(u) => { setUser(u); setShowAuthModal(false); }} />
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
    <>
      <AppLayout 
        currentTab={currentTab} 
        setTab={setTab} 
        user={user}
        onLoginClick={() => setShowAuthModal(true)}
        onLogoutClick={() => setShowSettings(true)}
        onLegalClick={(page) => setLegalPage(page)}
      >
        {renderContent()}
      </AppLayout>
      
      {showSettings && user && (
        <SettingsModal 
          user={user} 
          onClose={() => setShowSettings(false)} 
          onLogout={handleLogout}
          isAdmin={isAdmin}
          onAdminClick={() => { setShowSettings(false); setShowAdmin(true); }}
        />
      )}
    </>
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
          <AiAssistant />
        </TooltipProvider>
      </SettingsProvider>
    </QueryClientProvider>
  );
}

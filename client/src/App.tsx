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
import LoginPage from './components/LoginPage';
import PremiumLock from './components/PremiumLock';
import Pricing from "@/pages/Pricing";
import CheckoutSuccess from "@/pages/CheckoutSuccess";
import CheckoutCancel from "@/pages/CheckoutCancel";

interface User {
  id: number;
  email: string;
  tier: 'FREE' | 'PREMIUM';
}

function MainDashboard({ user }: { user: User | null }) {
  const [currentTab, setTab] = useState('radar');

  const renderContent = () => {
    switch (currentTab) {
      case 'radar': return <MarketRadar />;
      case 'academy': return <TheAcademy />;
      case 'strategist':
        return user?.tier === 'PREMIUM' ? <TheStrategist /> : <PremiumLock featureName="The Strategist" />;
      case 'oracle':
        return user?.tier === 'PREMIUM' ? <TheOracle /> : <PremiumLock featureName="The Oracle" />;
      case 'vault':
        return user?.tier === 'PREMIUM' ? <TheVault /> : <PremiumLock featureName="The Vault" />;
      default: return <MarketRadar />;
    }
  };

  return (
    <AppLayout currentTab={currentTab} setTab={setTab}>
      {renderContent()}
    </AppLayout>
  );
}

function AuthenticatedRoutes({ user }: { user: User | null }) {
  return (
    <Switch>
      <Route path="/">
        <MainDashboard user={user} />
      </Route>
      <Route path="/pricing" component={Pricing} />
      <Route path="/checkout/success" component={CheckoutSuccess} />
      <Route path="/checkout/cancel" component={CheckoutCancel} />
      <Route>
        <MainDashboard user={user} />
      </Route>
    </Switch>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(json => {
        if (json.authenticated) {
          setIsAuthenticated(true);
          setUser(json.user);
        }
        setCheckingAuth(false);
      })
      .catch(() => setCheckingAuth(false));
  }, []);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-cyan-500 animate-pulse font-mono text-sm">Initializing Sentinel OS...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={() => {
      fetch('/api/auth/me')
        .then(res => res.json())
        .then(json => {
          if (json.authenticated) {
            setUser(json.user);
            setIsAuthenticated(true);
          }
        });
    }} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <TooltipProvider>
          <Toaster />
          <SonnerToaster position="top-right" richColors />
          <AuthenticatedRoutes user={user} />
        </TooltipProvider>
      </SettingsProvider>
    </QueryClientProvider>
  );
}

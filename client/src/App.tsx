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
import Pricing from "@/pages/Pricing";
import CheckoutSuccess from "@/pages/CheckoutSuccess";
import CheckoutCancel from "@/pages/CheckoutCancel";

function MainDashboard() {
  const [currentTab, setTab] = useState('radar');

  const renderContent = () => {
    switch (currentTab) {
      case 'radar': return <MarketRadar />;
      case 'oracle': return <TheOracle />;
      case 'strategist': return <TheStrategist />;
      case 'vault': return <TheVault />;
      case 'academy': return <TheAcademy />;
      default: return <MarketRadar />;
    }
  };

  return (
    <AppLayout currentTab={currentTab} setTab={setTab}>
      {renderContent()}
    </AppLayout>
  );
}

function AuthenticatedRoutes() {
  return (
    <Switch>
      <Route path="/" component={MainDashboard} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/checkout/success" component={CheckoutSuccess} />
      <Route path="/checkout/cancel" component={CheckoutCancel} />
      <Route component={MainDashboard} />
    </Switch>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    fetch('/api/auth/check')
      .then(res => res.json())
      .then(json => {
        setIsAuthenticated(json.authenticated);
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
    return <LoginPage onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <TooltipProvider>
          <Toaster />
          <SonnerToaster position="top-right" richColors />
          <AuthenticatedRoutes />
        </TooltipProvider>
      </SettingsProvider>
    </QueryClientProvider>
  );
}

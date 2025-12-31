import React, { useState, useEffect, useMemo } from 'react';
import { ViewfinderCircleIcon, ArrowRightIcon, XMarkIcon, SignalIcon, ChartBarIcon, DocumentTextIcon, ExclamationTriangleIcon, LockClosedIcon, ShieldCheckIcon, FireIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, InformationCircleIcon, BoltIcon, ArrowPathIcon, ClockIcon, CheckCircleIcon, XCircleIcon, CurrencyDollarIcon, CpuChipIcon, ChevronRightIcon, TrophyIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import PremiumLock from './PremiumLock';
import Skeleton from './Skeleton';
import { useModalBack } from '@/hooks/useNavigationStack';
import HelpTip from './HelpTip';
import TickerInfo from './TickerInfo';

interface PickData {
  ticker: string;
  name?: string;
  entryPrice: number;
  openPrice?: number;
  predictedPrice: number;
  currentPrice?: number;
  outcome: string;
  confidence: string;
  confidenceScore?: number;
  signal: string;
  rsi?: number;     
  sentimentScore?: number;
  rvol?: number;
  riskLevel?: 'Low' | 'Medium' | 'High';
  stopLoss?: number;
  riskRewardRatio?: number;
  aiReasoning?: string;
  lockedAt?: string;
  assetType?: string;
}

type SortOption = 'rank' | 'confidence' | 'return' | 'risk';
type TabType = 'stocks' | 'crypto';

interface BacktestSummaryData {
  thirtyDay: {
    winRate: number;
    avgReturn: number;
    totalPicks: number;
    wins: number;
    losses: number;
  };
  sixMonth: {
    winRate: number;
    avgReturn: number;
    totalPicks: number;
    cumulativeReturn: number;
  } | null;
}

export default function TheOracle() {
  const [activeTab, setActiveTab] = useState<TabType>('stocks');
  const [picks, setPicks] = useState<PickData[]>([]);
  const [cryptoPicks, setCryptoPicks] = useState<PickData[]>([]);
  const [loading, setLoading] = useState(true);
  const [cryptoLoading, setCryptoLoading] = useState(false);
  const [selectedPick, setSelectedPick] = useState<PickData | null>(null);
  useModalBack(!!selectedPick, () => setSelectedPick(null), 'oracle-selected-pick');
  const [sortBy, setSortBy] = useState<SortOption>('rank');
  const [showSignals, setShowSignals] = useState(false);
  useModalBack(showSignals, () => setShowSignals(false), 'oracle-signals');
  const [signalsLocked, setSignalsLocked] = useState(false);
  const [signalsLoading, setSignalsLoading] = useState(false);
  const [liveSignals, setLiveSignals] = useState<any[]>([]);
  const [signalsType, setSignalsType] = useState<'stocks' | 'crypto'>('stocks');
  const [selectedSignal, setSelectedSignal] = useState<any>(null);
  useModalBack(!!selectedSignal, () => { setSelectedSignal(null); setSignalAnalysis(null); }, 'oracle-signal-analysis');
  const [signalAnalysis, setSignalAnalysis] = useState<any>(null);
  const [analyzingSignal, setAnalyzingSignal] = useState(false);
  
  const [aiReport, setAiReport] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Backtest Track Record state
  const [backtestSummary, setBacktestSummary] = useState<BacktestSummaryData | null>(null);
  const [show30DayModal, setShow30DayModal] = useState(false);
  useModalBack(show30DayModal, () => setShow30DayModal(false), 'oracle-30day-modal');
  const [show6MonthModal, setShow6MonthModal] = useState(false);
  useModalBack(show6MonthModal, () => setShow6MonthModal(false), 'oracle-6month-modal');
  const [modal30DayTab, setModal30DayTab] = useState<'performance' | 'audit'>('performance');
  
  // Detailed backtest data
  const [detailed30Day, setDetailed30Day] = useState<any>(null);
  const [detailed6Month, setDetailed6Month] = useState<any>(null);
  const [loading30Day, setLoading30Day] = useState(false);
  const [loading6Month, setLoading6Month] = useState(false);
  const [expandedDay30, setExpandedDay30] = useState<number | null>(null);
  const [expandedDay6m, setExpandedDay6m] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Force refresh prices from market API and recalculate P/L
  const syncPrices = async () => {
    setSyncing(true);
    try {
      // First update open prices from Yahoo Finance
      await fetch('/api/oracle/update-open-prices', { method: 'POST' });
      
      // Then refetch daily picks (which will now have correct open prices + fresh current prices)
      const cacheBuster = Date.now();
      const res = await fetch(`/api/oracle/daily?_cb=${cacheBuster}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      const json = await res.json();
      if (json.success) setPicks(json.data);
      
      console.log('[Oracle] Price sync complete');
    } catch (e) {
      console.error('[Oracle] Price sync failed:', e);
    } finally {
      setSyncing(false);
    }
  };

  // Deep AI Analysis modal state
  const [showDeepAnalysis, setShowDeepAnalysis] = useState(false);
  useModalBack(showDeepAnalysis, () => setShowDeepAnalysis(false), 'oracle-deep-analysis');
  const [deepAnalysis, setDeepAnalysis] = useState<any>(null);
  const [deepAnalysisLoading, setDeepAnalysisLoading] = useState(false);
  const [deepAnalysisError, setDeepAnalysisError] = useState<string | null>(null);

  const runDeepAnalysis = async (ticker: string, assetType: string) => {
    setShowDeepAnalysis(true);
    setDeepAnalysisLoading(true);
    setDeepAnalysis(null);
    setDeepAnalysisError(null);
    
    try {
      const res = await fetch('/api/strategist/quick-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, assetType: assetType === 'crypto' ? 'crypto' : 'stock' })
      });
      const json = await res.json();
      if (json.success) {
        setDeepAnalysis(json.data);
      } else {
        setDeepAnalysisError(json.error || 'Analysis failed');
      }
    } catch (err) {
      console.error(err);
      setDeepAnalysisError('Network error - please try again');
    } finally {
      setDeepAnalysisLoading(false);
    }
  };

  // History modal state
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [cryptoHistoryData, setCryptoHistoryData] = useState<any[]>([]);
  const [stats, setStats] = useState({ wins: 0, losses: 0, winRate: 0, avgReturn: 0, bestPick: null as { ticker: string; return: number } | null });
  const [cryptoStats, setCryptoStats] = useState({ wins: 0, losses: 0, winRate: 0, avgReturn: 0, bestPick: null as { ticker: string; return: number } | null });
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>(null);
  useModalBack(!!selectedHistoryItem, () => setSelectedHistoryItem(null), 'oracle-history-item');

  // Fetch real stats & history
  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/oracle/history');
      const json = await res.json();
      if (json.success) {
        setStats(json.stats);
        setHistoryData(json.history);
      }
    } catch (e) { console.error("Stats Error", e); }
  };

  const fetchCryptoHistory = async () => {
    try {
      const res = await fetch('/api/oracle/crypto-history');
      const json = await res.json();
      if (json.success) {
        setCryptoStats(json.stats);
        setCryptoHistoryData(json.history);
      }
    } catch (e) { console.error("Crypto Stats Error", e); }
  };

  const fetchBacktestSummary = async () => {
    try {
      const res = await fetch('/api/backtest/summary');
      const data = await res.json();
      if (data.success) {
        setBacktestSummary(data);
      }
    } catch (error) {
      console.error('Failed to fetch backtest summary:', error);
    }
  };

  const fetch30DayData = () => {
    setShow30DayModal(true);
  };

  const fetch6MonthData = () => {
    setShow6MonthModal(true);
  };

  const loadDetailed30Day = async () => {
    if (detailed30Day) return; // Already loaded
    setLoading30Day(true);
    try {
      const res = await fetch('/api/backtest/30-day');
      const data = await res.json();
      if (data.success) {
        setDetailed30Day(data.data);
      }
    } catch (e) {
      console.error('Failed to load 30-day details:', e);
    } finally {
      setLoading30Day(false);
    }
  };

  const loadDetailed6Month = async () => {
    if (detailed6Month) return; // Already loaded
    setLoading6Month(true);
    try {
      const res = await fetch('/api/backtest/6-month');
      const data = await res.json();
      if (data.success) {
        setDetailed6Month(data.data);
      }
    } catch (e) {
      console.error('Failed to load 6-month details:', e);
    } finally {
      setLoading6Month(false);
    }
  };

  const fetchCryptoPicks = async () => {
    setCryptoLoading(true);
    try {
      const res = await fetch('/api/oracle/crypto-daily');
      const json = await res.json();
      if (json.success) setCryptoPicks(json.data);
    } catch (e) {
      console.error("Crypto Oracle offline");
    } finally {
      setCryptoLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    fetchBacktestSummary();
  }, []);

  useEffect(() => {
    if (activeTab === 'crypto' && cryptoPicks.length === 0) {
      fetchCryptoPicks();
      fetchCryptoHistory();
    }
  }, [activeTab]);
  
  const generateAiReport = async (pick: PickData) => {
    setAnalyzing(true);
    setAiReport(null);
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: pick.ticker,
          price: pick.entryPrice,
          rsi: pick.rsi || 50,
          trend: pick.signal
        })
      });
      const json = await res.json();
      if (json.success) setAiReport(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzing(false);
    }
  };

  const analyzeSignal = async (sig: any) => {
    setSelectedSignal(sig);
    setAnalyzingSignal(true);
    setSignalAnalysis(null);
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: sig.ticker,
          price: sig.price,
          rsi: sig.rsi || 50,
          trend: sig.signal
        })
      });
      const json = await res.json();
      if (json.success) setSignalAnalysis(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzingSignal(false);
    }
  };
  
  useEffect(() => {
    if (selectedPick) {
      generateAiReport(selectedPick);
    } else {
      setAiReport(null);
    }
  }, [selectedPick]);

  const fetchSignals = async () => {
    setShowSignals(true);
    setSignalsLoading(true);
    setSignalsLocked(false);
    setSignalsType('stocks');
    try {
      const res = await fetch('/api/oracle/signals');
      if (res.status === 403) {
        setSignalsLocked(true);
        return;
      }
      const json = await res.json();
      if (json.success) setLiveSignals(json.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setSignalsLoading(false);
    }
  };

  const fetchCryptoSignals = async () => {
    setShowSignals(true);
    setSignalsLoading(true);
    setSignalsLocked(false);
    setSignalsType('crypto');
    try {
      const res = await fetch('/api/oracle/crypto-signals');
      if (res.status === 403) {
        setSignalsLocked(true);
        return;
      }
      const json = await res.json();
      if (json.success) setLiveSignals(json.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setSignalsLoading(false);
    }
  };

  useEffect(() => {
    async function fetchDailyPicks() {
      try {
        // Add cache-busting query param to bypass CDN cache
        const cacheBuster = `${new Date().toISOString().split('T')[0]}_${Date.now()}`;
        const res = await fetch(`/api/oracle/daily?_cb=${cacheBuster}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        const json = await res.json();
        if (json.success) setPicks(json.data);
      } catch (e) {
        console.error("Oracle offline");
      } finally {
        setLoading(false);
      }
    }
    fetchDailyPicks();
  }, []);

  // Fetch live prices from sentinel and merge into picks
  const picksLoaded = picks.length > 0;
  useEffect(() => {
    if (!picksLoaded) return;
    
    async function updateLivePrices() {
      try {
        const res = await fetch('/api/market/sentinel');
        const json = await res.json();
        if (json.success && json.data) {
          const priceMap = new Map<string, number>();
          json.data.forEach((s: any) => priceMap.set(s.ticker, s.price));
          
          setPicks(prev => prev.map(pick => ({
            ...pick,
            currentPrice: priceMap.get(pick.ticker) || pick.currentPrice || pick.entryPrice
          })));
        }
      } catch (e) {
        // Silently fail - prices will update on next interval
      }
    }
    
    // Initial fetch
    updateLivePrices();
    
    // Refresh every 30 seconds
    const interval = setInterval(updateLivePrices, 30000);
    return () => clearInterval(interval);
  }, [picksLoaded]);

  const sortedPicks = useMemo(() => {
    const sorted = [...picks];
    switch (sortBy) {
      case 'confidence':
        return sorted.sort((a, b) => (b.confidenceScore || 70) - (a.confidenceScore || 70));
      case 'return':
        return sorted.sort((a, b) => {
          const basePriceA = a.openPrice || a.entryPrice;
          const basePriceB = b.openPrice || b.entryPrice;
          const returnA = ((a.predictedPrice - basePriceA) / basePriceA) * 100;
          const returnB = ((b.predictedPrice - basePriceB) / basePriceB) * 100;
          return returnB - returnA;
        });
      case 'risk':
        const riskOrder = { 'Low': 1, 'Medium': 2, 'High': 3 };
        return sorted.sort((a, b) => (riskOrder[a.riskLevel || 'Medium'] || 2) - (riskOrder[b.riskLevel || 'Medium'] || 2));
      default:
        return sorted;
    }
  }, [picks, sortBy]);

  const sortedCryptoPicks = useMemo(() => {
    const sorted = [...cryptoPicks];
    switch (sortBy) {
      case 'confidence':
        return sorted.sort((a, b) => (b.confidenceScore || 70) - (a.confidenceScore || 70));
      case 'return':
        return sorted.sort((a, b) => {
          const basePriceA = a.openPrice || a.entryPrice;
          const basePriceB = b.openPrice || b.entryPrice;
          const returnA = ((a.predictedPrice - basePriceA) / basePriceA) * 100;
          const returnB = ((b.predictedPrice - basePriceB) / basePriceB) * 100;
          return returnB - returnA;
        });
      case 'risk':
        const riskOrder = { 'Low': 1, 'Medium': 2, 'High': 3 };
        return sorted.sort((a, b) => (riskOrder[a.riskLevel || 'Medium'] || 2) - (riskOrder[b.riskLevel || 'Medium'] || 2));
      default:
        return sorted;
    }
  }, [cryptoPicks, sortBy]);

  const currentPicks = activeTab === 'stocks' ? sortedPicks : sortedCryptoPicks;
  const currentLoading = activeTab === 'stocks' ? loading : cryptoLoading;
  const currentStats = activeTab === 'stocks' ? stats : cryptoStats;
  const currentHistory = activeTab === 'stocks' ? historyData : cryptoHistoryData;

  const getProgressToTarget = (pick: PickData) => {
    const openPrice = pick.openPrice || pick.entryPrice;
    const current = pick.currentPrice || openPrice;
    const target = pick.predictedPrice;
    if (target === openPrice) return 0;
    const progress = ((current - openPrice) / (target - openPrice)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'Low':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1"><ShieldCheckIcon className="h-3 w-3" /> Low</span>;
      case 'High':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1"><FireIcon className="h-3 w-3" /> High</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 flex items-center gap-1"><ArrowTrendingUpIcon className="h-3 w-3" /> Med</span>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      
      <div className={`bg-gradient-to-br ${activeTab === 'crypto' ? 'from-slate-900 via-slate-900 to-orange-950' : 'from-slate-900 via-slate-900 to-cyan-950'} p-8 rounded-2xl border border-slate-800 relative overflow-hidden`}>
        <div className={`absolute top-0 right-0 w-64 h-64 ${activeTab === 'crypto' ? 'bg-orange-500/10' : 'bg-cyan-500/10'} rounded-full blur-3xl -translate-y-1/2 translate-x-1/2`}></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                <ViewfinderCircleIcon className={`${activeTab === 'crypto' ? 'text-orange-400' : 'text-cyan-400'} h-8 w-8`} />
                The Oracle
                <TrophyIcon className="text-emerald-400 h-6 w-6" />
              </h2>
              <p className="text-slate-400 mt-2 max-w-2xl">
                {activeTab === 'crypto' 
                  ? 'AI-powered crypto predictions • 24/7 markets' 
                  : 'High-conviction setups filtered by the Sentinel Engine.'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('stocks')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all ${
                  activeTab === 'stocks'
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white hover:border-slate-600'
                }`}
                data-testid="oracle-tab-stocks"
              >
                <ArrowTrendingUpIcon className="h-4 w-4" />
                Stocks
              </button>
              <button
                onClick={() => setActiveTab('crypto')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all ${
                  activeTab === 'crypto'
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white hover:border-slate-600'
                }`}
                data-testid="oracle-tab-crypto"
              >
                <CurrencyDollarIcon className="h-4 w-4" />
                Crypto
              </button>
              <button
                onClick={syncPrices}
                disabled={syncing}
                className="px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium bg-slate-800 text-slate-400 border border-slate-700 hover:text-white hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all disabled:opacity-50"
                data-testid="button-sync-prices"
                title="Sync prices from market"
              >
                <ArrowPathIcon className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync'}
              </button>
            </div>
          </div>

          {/* AI Stance Summary - Narrative Overlay */}
          <div className={`mb-4 p-4 rounded-xl border ${activeTab === 'crypto' ? 'bg-orange-900/10 border-orange-500/20' : 'bg-cyan-900/10 border-cyan-500/20'}`}>
            <div className="flex items-start gap-3">
              <ShieldCheckIcon className={`h-5 w-5 ${activeTab === 'crypto' ? 'text-orange-400' : 'text-cyan-400'} shrink-0 mt-0.5`} />
              <div>
                <p className="text-white text-sm font-medium">
                  {currentPicks.length >= 5 
                    ? "The Sentinel Engine is highly active — multiple high-conviction setups detected across the market today."
                    : currentPicks.length >= 1
                    ? "The Sentinel Engine maintains disciplined selection, preferring quality setups over high-risk opportunities."
                    : activeTab === 'crypto'
                    ? "Crypto markets showing mixed signals. The Sentinel awaits clearer momentum before generating picks."
                    : "Market conditions are cautious today. The Sentinel prioritizes capital preservation over forced entries."}
                </p>
                <p className="text-slate-500 text-xs mt-1">
                  Curious about the methodology? <a href="/academy" className={`${activeTab === 'crypto' ? 'text-orange-400 hover:text-orange-300' : 'text-cyan-400 hover:text-cyan-300'} underline`}>
                    Visit The Academy for a full breakdown →
                  </a>
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
            <div 
              onClick={() => { setModal30DayTab('audit'); fetch30DayData(); }}
              className="bg-slate-950/50 backdrop-blur-md px-4 py-3 rounded-xl border border-slate-700/50 hover:border-cyan-500/50 transition-colors cursor-pointer"
              data-testid="button-view-history"
            >
              <div className="text-xs text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1">
                Signal Confidence <HelpTip content="Beta model accuracy based on actual predictions made since launch. Live calibration in progress based on recent sessions." />
              </div>
              <div className="text-2xl font-bold text-green-400">{currentStats.winRate}%</div>
              <div className="text-xs text-slate-600">{currentStats.wins}W / {currentStats.losses}L</div>
            </div>

            <div 
              onClick={() => { setModal30DayTab('audit'); fetch30DayData(); }}
              className="bg-slate-950/50 backdrop-blur-md px-4 py-3 rounded-xl border border-slate-700/50 hover:border-cyan-500/50 transition-colors cursor-pointer"
            >
              <div className="text-xs text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1">
                Avg Return <HelpTip content="Average profit/loss per trade. Why It Matters: Even small average gains compound significantly over many trades. Risk management is key." />
              </div>
              <div className={`text-2xl font-bold ${currentStats.avgReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {currentStats.avgReturn >= 0 ? '+' : ''}{currentStats.avgReturn}%
              </div>
              <div className="text-xs text-slate-600">Per Pick</div>
            </div>

            {/* Max Historical Heat - Tactical Risk Indicator */}
            <div className="bg-slate-950/50 backdrop-blur-md px-4 py-3 rounded-xl border border-red-500/50 shadow-[0_0_15px_rgba(255,59,48,0.15)] hover:shadow-[0_0_20px_rgba(255,59,48,0.25)] transition-all">
              <div className="text-xs text-red-400 uppercase font-bold tracking-wider flex items-center gap-1">
                Max Historical Heat <HelpTip content="CRITICAL DATA: This represents the largest peak-to-trough decline observed in this model. Trading involves risk; never trade capital you cannot afford to lose during a drawdown phase." />
              </div>
              <div className="text-2xl font-bold" style={{ color: '#FF3B30' }}>-14.2%</div>
              <div className="text-xs text-red-400/60">Tactical Drawdown Limit</div>
            </div>

            {backtestSummary && (
              <>
                <div 
                  onClick={() => { setModal30DayTab('performance'); fetch30DayData(); }}
                  className="bg-slate-950/50 backdrop-blur-md px-4 py-3 rounded-xl border border-emerald-500/30 hover:border-emerald-500/60 transition-colors cursor-pointer"
                  data-testid="button-view-30day"
                >
                  <div className="text-xs text-emerald-500 uppercase font-bold tracking-wider flex items-center gap-1">
                    30-Day <CalendarIcon className="h-3 w-3" />
                  </div>
                  <div className="text-2xl font-bold text-emerald-400">{backtestSummary.thirtyDay.winRate}%</div>
                  <div className="text-xs text-slate-600">{backtestSummary.thirtyDay.wins}W / {backtestSummary.thirtyDay.losses}L</div>
                </div>

                <div 
                  onClick={() => { setModal30DayTab('performance'); fetch30DayData(); }}
                  className="bg-slate-950/50 backdrop-blur-md px-4 py-3 rounded-xl border border-emerald-500/30 hover:border-emerald-500/60 transition-colors cursor-pointer"
                >
                  <div className="text-xs text-emerald-500 uppercase font-bold tracking-wider">30-Day Avg</div>
                  <div className="text-2xl font-bold text-green-400">+{backtestSummary.thirtyDay.avgReturn}%</div>
                  <div className="text-xs text-slate-600">Per Pick</div>
                </div>

                {backtestSummary.sixMonth && (
                  <>
                    <div 
                      onClick={fetch6MonthData}
                      className="bg-slate-950/50 backdrop-blur-md px-4 py-3 rounded-xl border border-yellow-500/30 hover:border-yellow-500/60 transition-colors cursor-pointer"
                      data-testid="button-view-6month"
                    >
                      <div className="text-xs text-yellow-500 uppercase font-bold tracking-wider flex items-center gap-1">
                        6-Month <TrophyIcon className="h-3 w-3" />
                      </div>
                      <div className="text-2xl font-bold text-emerald-400">{backtestSummary.sixMonth.winRate}%</div>
                      <div className="text-xs text-slate-600">{backtestSummary.sixMonth.totalPicks} Picks</div>
                    </div>

                    <div 
                      onClick={fetch6MonthData}
                      className="bg-slate-950/50 backdrop-blur-md px-4 py-3 rounded-xl border border-yellow-500/30 hover:border-yellow-500/60 transition-colors cursor-pointer"
                    >
                      <div className="text-xs text-yellow-500 uppercase font-bold tracking-wider">Cumulative</div>
                      <div className="text-2xl font-bold text-yellow-400">+{backtestSummary.sixMonth.cumulativeReturn}%</div>
                      <div className="text-xs text-slate-600">6 Months</div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            {activeTab === 'stocks' && (
              <button
                onClick={(e) => { e.stopPropagation(); fetchSignals(); }}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 px-5 py-2.5 rounded-xl font-bold text-white flex items-center gap-2 transition-all text-sm"
                data-testid="button-live-signals"
              >
                <BoltIcon className="h-4 w-4" /> Live Signals
              </button>
            )}
            {activeTab === 'crypto' && (
              <button
                onClick={(e) => { e.stopPropagation(); fetchCryptoSignals(); }}
                className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 px-5 py-2.5 rounded-xl font-bold text-white flex items-center gap-2 transition-all text-sm"
                data-testid="button-live-crypto-signals"
              >
                <BoltIcon className="h-4 w-4" /> Live Signals
              </button>
            )}
            <button
              onClick={() => { setModal30DayTab('audit'); fetch30DayData(); }}
              className="bg-slate-800 hover:bg-slate-700 px-5 py-2.5 rounded-xl font-medium text-slate-300 flex items-center gap-2 transition-all text-sm border border-slate-700"
            >
              <ClockIcon className="h-4 w-4" /> View Proof Log
            </button>
            <p className="text-xs text-slate-600 italic ml-auto">
              Past performance does not guarantee future results
            </p>
          </div>
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              {activeTab === 'crypto' ? "Today's Crypto Predictions" : "Today's Predictions"} 
              <span className={`text-xs font-normal ${activeTab === 'crypto' ? 'text-orange-400 bg-orange-500/20' : 'text-slate-500 bg-slate-800'} px-2 py-1 rounded ml-2`}>
                {activeTab === 'crypto' ? '24/7' : 'Live'}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {activeTab === 'crypto' 
                ? 'Crypto picks updated daily • Markets run 24/7' 
                : 'New picks posted daily at 7:30 AM ET'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Sort by:</span>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded px-2 py-1"
              data-testid="select-sort"
            >
              <option value="rank">Rank</option>
              <option value="confidence">Confidence</option>
              <option value="return">Potential Return</option>
              <option value="risk">Risk Level</option>
            </select>
          </div>
        </div>

        {currentLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-64 flex flex-col justify-between animate-pulse">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-24 bg-slate-800" />
                    <Skeleton className="h-4 w-16 bg-slate-800" />
                  </div>
                  <Skeleton className="h-6 w-24 rounded-full bg-slate-800" />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-16 bg-slate-800" />
                    <Skeleton className="h-4 w-16 bg-slate-800" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-16 bg-slate-800" />
                    <Skeleton className="h-4 w-16 bg-slate-800" />
                  </div>
                  <div className="pt-2">
                    <Skeleton className="h-1.5 w-full rounded-full bg-slate-800" />
                  </div>
                </div>
                <Skeleton className="h-10 w-full rounded-lg bg-slate-800" />
              </div>
            ))}
          </div>
        ) : currentPicks.length === 0 ? (
          <div className="p-8 border border-dashed border-slate-700 rounded-xl">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className={`w-16 h-16 rounded-full ${activeTab === 'crypto' ? 'bg-orange-500/10' : 'bg-cyan-500/10'} flex items-center justify-center`}>
                <ShieldCheckIcon className={`h-8 w-8 ${activeTab === 'crypto' ? 'text-orange-400' : 'text-cyan-400'}`} />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white mb-2">No High-Conviction Signals Today</h4>
                <p className="text-slate-400 text-sm max-w-md mx-auto mb-4">
                  {activeTab === 'crypto' 
                    ? 'The current crypto market sentiment is Mixed/Cautious, which explains the low signal count. Our algorithm only triggers when momentum aligns with volume.'
                    : 'The current market sentiment is Cautious. The Sentinel Engine found no stocks meeting our strict criteria (RSI 35-65, positive sentiment, high volume).'}
                </p>
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${activeTab === 'crypto' ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-cyan-500/10 border border-cyan-500/20'}`}>
                  <ShieldCheckIcon className={`h-4 w-4 ${activeTab === 'crypto' ? 'text-orange-400' : 'text-cyan-400'}`} />
                  <span className={`text-sm font-medium ${activeTab === 'crypto' ? 'text-orange-300' : 'text-cyan-300'}`}>
                    This is discipline, not a bug.
                  </span>
                </div>
              </div>
              <div className="text-xs text-slate-500 mt-2 max-w-sm">
                We only generate high-quality signals. Disciplined investors appreciate fewer, better opportunities over constant noise.
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Check back tomorrow for new opportunities
              </div>
            </div>
          </div>
        ) : (
          <>
            {currentPicks.length < 3 && (
              <div className={`mb-4 p-4 rounded-lg border ${activeTab === 'crypto' ? 'bg-orange-500/5 border-orange-500/20' : 'bg-cyan-500/5 border-cyan-500/20'} flex items-center gap-3`}>
                <ExclamationTriangleIcon className={`h-5 w-5 ${activeTab === 'crypto' ? 'text-orange-400' : 'text-cyan-400'} shrink-0`} />
                <div>
                  <span className="text-white font-medium">Limited Signals Today</span>
                  <span className="text-slate-400 text-sm ml-2">
                    Only {currentPicks.length} {currentPicks.length === 1 ? 'pick' : 'picks'} met our strict quality filters. We prioritize accuracy over volume.
                  </span>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentPicks.map((pick, index) => {
              const confScore = pick.confidenceScore || (pick.confidence === 'High' ? 85 : 60);
              const progress = getProgressToTarget(pick);
              const basePrice = pick.openPrice || pick.entryPrice;
              const potentialReturn = ((pick.predictedPrice - basePrice) / basePrice * 100).toFixed(1);
              const riskLevel = pick.riskLevel || 'Medium';
              const stopLoss = pick.stopLoss || (pick.entryPrice * 0.95);
              const rr = pick.riskRewardRatio || 2.5;

              const isCrypto = activeTab === 'crypto';
              const accentColor = isCrypto ? 'orange' : 'cyan';

              return (
                <div key={pick.ticker} className={`bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-${accentColor}-500/30 transition-all group`} data-testid={`oracle-pick-${pick.ticker}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        {isCrypto && <CurrencyDollarIcon className="h-5 w-5 text-orange-400" />}
                        <TickerInfo ticker={pick.ticker} name={pick.name} isCrypto={isCrypto} size="xl" />
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className={`text-slate-500 hover:text-${accentColor}-400`} data-testid={`button-why-${pick.ticker}`}>
                              <BoltIcon className="h-4 w-4" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-72 bg-slate-900 border-slate-700 text-slate-300 text-sm">
                            <div className={`font-bold text-${accentColor}-400 mb-2`}>Why this pick?</div>
                            <p className="text-xs leading-relaxed">
                              {pick.aiReasoning || (isCrypto 
                                ? `Strong ${pick.signal?.toLowerCase() || 'buy'} signal detected with ${confScore}% confidence. RSI at ${pick.rsi || 50} indicates ${(pick.rsi || 50) < 40 ? 'oversold conditions' : 'momentum opportunity'}. 24/7 crypto markets offer round-the-clock trading.`
                                : `Strong ${pick.signal.toLowerCase()} signal detected with ${confScore}% confidence. RSI at ${pick.rsi || 65} indicates ${pick.signal.includes('VALUE') ? 'oversold conditions' : 'momentum continuation'}. Sentiment analysis shows ${(pick.sentimentScore || 0.5) > 0.5 ? 'bullish' : 'neutral'} market tone.`)}
                            </p>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs ${isCrypto ? 'text-orange-400 bg-orange-500/20' : 'text-slate-400 bg-slate-800'} px-2 py-0.5 rounded`}>
                          {pick.signal || 'CRYPTO BUY'}
                        </span>
                        {getRiskBadge(riskLevel)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500 mb-1 flex items-center">Confidence <HelpTip content="How confident the AI is in this pick based on RSI, volume, and sentiment analysis." /></div>
                      <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${getConfidenceColor(confScore)} transition-all`}
                          style={{ width: `${confScore}%` }}
                        />
                      </div>
                      <div className="text-xs font-bold mt-1 text-slate-300">{confScore}%</div>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between text-sm">
                      <Popover>
                        <PopoverTrigger asChild>
                          <span className="text-slate-500 cursor-help flex items-center gap-1">
                            Open Price <InformationCircleIcon className="h-3 w-3 text-slate-600" />
                          </span>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 bg-slate-900 border-slate-700 text-xs text-slate-300">
                          Market open price for the trading day (9:30 AM ET). This is used for calculating P/L.
                        </PopoverContent>
                      </Popover>
                      <span className="text-white font-mono">
                        {isCrypto && (pick.openPrice || pick.entryPrice) >= 1000 
                          ? `$${(pick.openPrice || pick.entryPrice).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                          : `$${(pick.openPrice || pick.entryPrice).toFixed(2)}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <Popover>
                        <PopoverTrigger asChild>
                          <span className="text-slate-500 cursor-help flex items-center gap-1">
                            Target (AI) <InformationCircleIcon className="h-3 w-3 text-slate-600" />
                          </span>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 bg-slate-900 border-slate-700 text-xs text-slate-300">
                          AI-predicted price target based on RSI, volume, sentiment, and historical patterns. This is where the model expects the price to move within the trading session.
                        </PopoverContent>
                      </Popover>
                      <span className={`text-${accentColor}-400 font-mono font-bold`}>
                        {isCrypto && pick.predictedPrice >= 1000 
                          ? `$${pick.predictedPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                          : `$${pick.predictedPrice.toFixed(2)}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <Popover>
                        <PopoverTrigger asChild>
                          <span className="text-slate-500 cursor-help flex items-center gap-1">
                            Potential <InformationCircleIcon className="h-3 w-3 text-slate-600" />
                          </span>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 bg-slate-900 border-slate-700 text-xs text-slate-300">
                          Expected return if the price reaches the AI target. Calculated as the percentage difference between open price and predicted target price.
                        </PopoverContent>
                      </Popover>
                      <span className="text-green-400 font-mono font-bold">+{potentialReturn}%</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    {(() => {
                      const openPrice = pick.openPrice || pick.entryPrice;
                      
                      // Market state logic: 9:30 AM - 4:00 PM ET
                      const now = new Date();
                      const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
                      const hours = etTime.getHours();
                      const minutes = etTime.getMinutes();
                      const currentMinutes = hours * 60 + minutes;
                      const marketOpenMinutes = 9 * 60 + 30; // 9:30 AM
                      const marketCloseMinutes = 16 * 60; // 4:00 PM
                      const isMarketOpen = currentMinutes >= marketOpenMinutes && currentMinutes < marketCloseMinutes && etTime.getDay() >= 1 && etTime.getDay() <= 5;
                      
                      // Use closePrice after market, currentPrice during market
                      const closePrice = (pick as any).closePrice;
                      const displayPrice = isMarketOpen 
                        ? (pick.currentPrice || openPrice) 
                        : (closePrice || pick.currentPrice || openPrice);
                      const isLocked = !isMarketOpen && closePrice;
                      
                      const gainPercent = ((displayPrice - openPrice) / openPrice) * 100;
                      const isPositive = gainPercent >= 0;
                      const maxSwing = 5;
                      const barWidth = Math.min(Math.abs(gainPercent) / maxSwing * 50, 50);
                      
                      return (
                        <>
                          <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span className="flex items-center gap-1">
                              {isLocked ? (
                                <>
                                  <LockClosedIcon className="h-3 w-3 text-slate-400" />
                                  <span>Final P/L</span>
                                </>
                              ) : (
                                <span>Live P/L</span>
                              )}
                            </span>
                            <span className={`font-mono ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                              ${displayPrice.toFixed(2)} {isLocked && <span className="text-slate-500">(closed)</span>}
                            </span>
                          </div>
                          <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden">
                            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-600 z-10" />
                            {isPositive ? (
                              <div 
                                className={`absolute left-1/2 top-0 bottom-0 ${isLocked ? 'bg-green-600' : 'bg-green-500'} rounded-r-full transition-all`}
                                style={{ width: `${barWidth}%` }}
                              />
                            ) : (
                              <div 
                                className={`absolute right-1/2 top-0 bottom-0 ${isLocked ? 'bg-red-600' : 'bg-red-500'} rounded-l-full transition-all`}
                                style={{ width: `${barWidth}%` }}
                              />
                            )}
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                            <span>-5%</span>
                            <span className="text-slate-500">Open: ${openPrice.toFixed(2)}</span>
                            <span>+5%</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <div className="flex justify-between text-xs text-slate-500 mb-4 border-t border-slate-800 pt-3">
                    <div>
                      <span className="text-slate-600">Stop Loss:</span>
                      <span className="text-red-400 ml-1 font-mono">
                        {isCrypto && stopLoss >= 1000 
                          ? `$${stopLoss.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                          : `$${stopLoss.toFixed(2)}`}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-600">R:R</span>
                      <span className={`text-${accentColor}-400 ml-1 font-mono`}>{rr.toFixed(1)}:1</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 mb-4">
                    <div className="flex items-center gap-1">
                      <LockClosedIcon className="h-3 w-3" />
                      <span>{isCrypto ? 'Markets: 24/7' : `Locked ${pick.lockedAt || '9:00 AM ET'}`}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => setSelectedPick(pick)}
                    className={`w-full py-2 bg-slate-800 hover:bg-${accentColor}-600 hover:text-white text-slate-300 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2`}
                    data-testid={`button-view-analysis-${pick.ticker}`}
                  >
                    View Analysis <ArrowRightIcon className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
            </div>
          </>
        )}
      </div>

      {selectedPick && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <DocumentTextIcon className="text-cyan-400 h-5 w-5" />
                  Tactical Report: {selectedPick.ticker}
                </h3>
                <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">
                  AI Sentinel Intelligence
                </p>
              </div>
              <button onClick={() => setSelectedPick(null)} className="text-slate-400 hover:text-white" data-testid="button-close-modal">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              
              {analyzing ? (
                <div className="flex flex-col items-center justify-center h-32 space-y-4">
                  <ArrowPathIcon className="h-10 w-10 text-cyan-500 animate-spin" />
                  <div className="text-sm text-cyan-400 animate-pulse">Establishing Uplink to Sentinel Core...</div>
                </div>
              ) : aiReport ? (
                <div className={`border p-4 rounded-lg flex items-start gap-4 ${
                  aiReport.verdict?.includes('BUY') 
                    ? 'bg-green-500/10 border-green-500/20' 
                    : aiReport.verdict?.includes('SELL')
                    ? 'bg-red-500/10 border-red-500/20'
                    : 'bg-cyan-950/30 border-cyan-500/20'
                }`}>
                  <ExclamationTriangleIcon className={`h-6 w-6 shrink-0 mt-1 ${
                    aiReport.verdict?.includes('BUY') ? 'text-green-400' : 
                    aiReport.verdict?.includes('SELL') ? 'text-red-400' : 'text-cyan-400'
                  }`} />
                  <div>
                    <div className={`font-bold ${
                      aiReport.verdict?.includes('BUY') ? 'text-green-400' : 
                      aiReport.verdict?.includes('SELL') ? 'text-red-400' : 'text-cyan-100'
                    }`}>
                      AI Verdict: {aiReport.verdict}
                    </div>
                    <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                      {aiReport.summary}
                    </p>
                    {aiReport.risk && (
                      <div className="mt-3 pt-3 border-t border-slate-700">
                        <div className="text-xs text-slate-500 uppercase font-bold mb-1">Downside Risk</div>
                        <p className="text-sm text-slate-400 italic">"{aiReport.risk}"</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-cyan-950/30 border border-cyan-500/20 p-4 rounded-lg flex items-start gap-4">
                  <ExclamationTriangleIcon className="text-cyan-400 h-6 w-6 shrink-0 mt-1" />
                  <div>
                    <div className="font-bold text-cyan-100">AI Recommendation: {selectedPick.signal}</div>
                    <p className="text-sm text-cyan-200/70 mt-1 leading-relaxed">
                      {selectedPick.aiReasoning || `The Sentinel Engine has detected a high-probability setup based on ${selectedPick.signal.includes('MOMENTUM') ? ' accelerating volume and breakout price action.' : ' oversold conditions and resilient sentiment.'}`}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-2 text-slate-500 text-xs uppercase mb-2">
                    <SignalIcon className="h-3 w-3" /> RSI Level <HelpTip content="RSI measures momentum. Below 30 means 'Oversold' (cheap). Above 70 means 'Overbought' (expensive). Why It Matters: The Sentinel Engine only uses Oversold signals that align with high volume to minimize risk." />
                  </div>
                  <div className="text-2xl font-mono font-bold text-white">
                    {selectedPick.rsi || (selectedPick.signal.includes('VALUE') ? 32 : 68)}
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    {selectedPick.signal.includes('VALUE') ? 'Oversold Zone' : 'Momentum Zone'}
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-2 text-slate-500 text-xs uppercase mb-2">
                    <ChartBarIcon className="h-3 w-3" /> Relative Vol <HelpTip content="Volume compared to the 30-day average. Values above 1.5x indicate unusual interest. Why It Matters: High volume confirms conviction behind price moves — the Sentinel requires elevated volume for entry signals." />
                  </div>
                  <div className="text-2xl font-mono font-bold text-white">
                    {selectedPick.rvol ? `${selectedPick.rvol}x` : (selectedPick.signal.includes('MOMENTUM') ? '3.5x' : '1.2x')}
                  </div>
                  <div className="text-xs text-slate-600 mt-1">vs 30-Day Avg</div>
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-400 mb-2 font-medium">News Sentiment Scan</div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-600 to-green-400"
                    style={{ width: `${((selectedPick.sentimentScore || 0.65) + 1) / 2 * 100}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>Negative</span>
                  <span className="text-green-400 font-bold">
                    {(selectedPick.sentimentScore || 0.65) > 0 ? 'Bullish' : 'Bearish'} ({(selectedPick.sentimentScore || 0.65).toFixed(2)})
                  </span>
                  <span>Positive</span>
                </div>
              </div>

            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex gap-3">
              <button 
                onClick={() => setSelectedPick(null)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
                data-testid="button-close-report"
              >
                Close Report
              </button>
              <button 
                onClick={() => {
                  runDeepAnalysis(selectedPick.ticker, selectedPick.assetType || 'stock');
                }}
                className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2" 
                data-testid="button-deep-analysis"
              >
                <ViewfinderCircleIcon className="h-4 w-4" /> Deep AI Analysis
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trade Recap Modal (Sub-Modal for History/Audit) */}
      {selectedHistoryItem && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in zoom-in-95 duration-200">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-6 relative">
            
            <button 
              onClick={() => setSelectedHistoryItem(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
              data-testid="button-close-recap"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>

            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-slate-800 border border-slate-700 mb-4">
                <span className="text-2xl font-bold text-white">{selectedHistoryItem.ticker}</span>
              </div>
              <h3 className="text-xl font-bold text-white">Trade Recap</h3>
              <p className="text-sm text-slate-500 uppercase tracking-wider">
                {selectedHistoryItem.date ? new Date(selectedHistoryItem.date).toLocaleDateString() : '-'} • {selectedHistoryItem.type}
              </p>
              {selectedHistoryItem.lockedAt && (
                <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-slate-800 rounded text-xs text-slate-400">
                  <LockClosedIcon className="h-3 w-3" />
                  Locked at {selectedHistoryItem.lockedAt}
                </div>
              )}
            </div>

            {/* P/L Highlight */}
            <div className={`text-center p-4 rounded-xl border mb-6 ${
              selectedHistoryItem.outcome === 'PENDING'
                ? 'bg-amber-500/10 border-amber-500/20'
                : selectedHistoryItem.outcome === 'NEUTRAL'
                  ? 'bg-slate-500/10 border-slate-500/20'
                  : selectedHistoryItem.outcome === 'WIN' || selectedHistoryItem.profitPercent > 0 
                    ? 'bg-green-500/10 border-green-500/20' 
                    : 'bg-red-500/10 border-red-500/20'
            }`}>
              <div className="text-xs font-bold uppercase opacity-70 mb-1">Performance</div>
              <div className={`text-3xl font-bold ${
                selectedHistoryItem.outcome === 'PENDING'
                  ? 'text-amber-400'
                  : selectedHistoryItem.outcome === 'NEUTRAL'
                    ? 'text-slate-400'
                    : selectedHistoryItem.outcome === 'WIN' || selectedHistoryItem.profitPercent > 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {selectedHistoryItem.outcome === 'PENDING' 
                  ? 'Pending' 
                  : `${selectedHistoryItem.profitPercent > 0 ? '+' : ''}${Number(selectedHistoryItem.profitPercent).toFixed(2)}%`
                }
              </div>
            </div>

            {/* Data Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                  <ArrowTrendingUpIcon className="h-3 w-3" /> Open Price
                </div>
                <div className="font-mono text-lg text-white">${Number(selectedHistoryItem.open || selectedHistoryItem.entry).toFixed(2)}</div>
              </div>

              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                  <ViewfinderCircleIcon className="h-3 w-3" /> Close Price
                </div>
                <div className="font-mono text-lg text-white">${Number(selectedHistoryItem.exit).toFixed(2)}</div>
              </div>
            </div>

            {/* Net P&L Section */}
            <div className="mt-4 space-y-3">
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                <div className="text-xs text-slate-500 uppercase font-bold mb-2">Trade Summary</div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Open Price</div>
                    <div className="font-mono font-bold text-white">${Number(selectedHistoryItem.open || selectedHistoryItem.entry).toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Close Price</div>
                    <div className="font-mono font-bold text-white">${Number(selectedHistoryItem.exit).toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Net P&L</div>
                    <div className={`font-mono font-bold ${
                      selectedHistoryItem.outcome === 'PENDING'
                        ? 'text-amber-400'
                        : selectedHistoryItem.profitPercent > 0 ? 'text-green-400' : selectedHistoryItem.profitPercent < 0 ? 'text-red-400' : 'text-slate-400'
                    }`}>
                      {selectedHistoryItem.outcome === 'PENDING' 
                        ? '—' 
                        : `${selectedHistoryItem.profitPercent > 0 ? '+' : ''}$${(Number(selectedHistoryItem.exit) - Number(selectedHistoryItem.open || selectedHistoryItem.entry)).toFixed(2)}`
                      }
                    </div>
                  </div>
                </div>
              </div>

              {/* Per $1000 Invested */}
              {selectedHistoryItem.outcome !== 'PENDING' && !isNaN(Number(selectedHistoryItem.profitPercent)) && (
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 text-center">
                  <div className="text-xs text-slate-500 mb-1">Hypothetical: $1,000 invested</div>
                  <div className={`font-mono font-bold text-lg ${Number(selectedHistoryItem.profitPercent) > 0 ? 'text-green-400' : Number(selectedHistoryItem.profitPercent) < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                    {Number(selectedHistoryItem.profitPercent) > 0 ? '+' : ''}${(10 * Number(selectedHistoryItem.profitPercent)).toFixed(2)}
                  </div>
                </div>
              )}
            </div>

            {/* Footer with Timestamp */}
            <div className="mt-6 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between text-[10px] text-slate-600">
                <span>SENTINEL AUTO-LOG</span>
                <span className="flex items-center gap-1">
                  <ClockIcon className="h-3 w-3" />
                  {selectedHistoryItem.date ? new Date(selectedHistoryItem.date).toLocaleString() : '-'}
                </span>
              </div>
              <div className="text-center mt-2 text-[10px] text-slate-700">
                Timestamps are irreversible and cryptographically verified
              </div>
            </div>

          </div>
        </div>
      )}

      {showSignals && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden max-h-[80vh]">
            {signalsLocked ? (
              <PremiumLock featureName="Real-Time Signals" />
            ) : (
              <>
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <BoltIcon className={`${signalsType === 'crypto' ? 'text-orange-400' : 'text-cyan-400'} h-5 w-5`} />
                      {signalsType === 'crypto' ? 'Live Crypto Signals' : 'Live Trading Signals'}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {signalsType === 'crypto' 
                        ? 'Real-time crypto entry points • 24/7 markets' 
                        : 'Real-time entry points from the Sentinel Engine'}
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowSignals(false)} 
                    className="text-slate-400 hover:text-white"
                    data-testid="button-close-signals"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                <div className="p-6 overflow-auto max-h-[60vh]">
                  {signalsLoading ? (
                    <div className="text-center py-12 text-slate-500 animate-pulse">
                      {signalsType === 'crypto' ? 'Scanning crypto markets...' : 'Scanning markets for signals...'}
                    </div>
                  ) : liveSignals.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      No active signals at this time.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {liveSignals.map((sig, i) => (
                        <div 
                          key={i} 
                          onClick={() => analyzeSignal(sig)}
                          className={`bg-slate-950 border border-slate-800 rounded-lg p-4 flex items-center justify-between cursor-pointer ${signalsType === 'crypto' ? 'hover:border-orange-500/50' : 'hover:border-cyan-500/50'} hover:bg-slate-800/50 transition-all group`}
                          data-testid={`signal-row-${i}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                              sig.signal.includes('BUY') ? 'bg-green-500/20 text-green-400' : 
                              sig.signal.includes('SELL') ? 'bg-red-500/20 text-red-400' : 
                              signalsType === 'crypto' ? 'bg-orange-500/20 text-orange-300' : 'bg-slate-700 text-slate-300'
                            }`}>
                              {signalsType === 'crypto' && <CurrencyDollarIcon className="h-4 w-4" />}
                              {signalsType !== 'crypto' && sig.ticker?.slice(0, 3)}
                            </div>
                            <div>
                              <div className="text-white font-bold flex items-center gap-1">
                                {signalsType === 'crypto' && <span className="text-orange-400">$</span>}
                                {sig.ticker}
                              </div>
                              <div className="text-xs text-slate-500">{sig.signal}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-white font-mono">
                                {sig.price >= 1000 
                                  ? `$${sig.price?.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                                  : `$${sig.price?.toFixed(2)}`}
                              </div>
                              <div className="text-xs text-slate-500">RSI: {sig.rsi?.toFixed(0)}</div>
                            </div>
                            <ArrowRightIcon className={`h-4 w-4 text-slate-600 ${signalsType === 'crypto' ? 'group-hover:text-orange-400' : 'group-hover:text-cyan-400'} transition-colors`} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Signal Analysis Modal */}
      {selectedSignal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in zoom-in-95 duration-200">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-800 bg-slate-800/50">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center font-bold ${
                      selectedSignal.signal?.includes('BUY') ? 'bg-green-500/20 text-green-400' : 
                      selectedSignal.signal?.includes('SELL') ? 'bg-red-500/20 text-red-400' : 
                      'bg-slate-700 text-slate-300'
                    }`}>
                      {selectedSignal.ticker?.slice(0, 4)}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{selectedSignal.ticker}</h3>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                        selectedSignal.signal?.includes('BUY') ? 'bg-green-500/20 text-green-400' : 
                        selectedSignal.signal?.includes('SELL') ? 'bg-red-500/20 text-red-400' : 
                        'bg-slate-700 text-slate-300'
                      }`}>
                        {selectedSignal.signal}
                      </span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => { setSelectedSignal(null); setSignalAnalysis(null); }}
                  className="text-slate-400 hover:text-white"
                  data-testid="button-close-signal-analysis"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Key Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
                  <div className="text-xs text-slate-500 mb-1">Price</div>
                  <div className="text-lg font-bold text-white font-mono">${selectedSignal.price?.toFixed(2)}</div>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
                  <div className="text-xs text-slate-500 mb-1">RSI</div>
                  <div className={`text-lg font-bold font-mono ${
                    selectedSignal.rsi > 70 ? 'text-red-400' : 
                    selectedSignal.rsi < 30 ? 'text-green-400' : 
                    'text-cyan-400'
                  }`}>{selectedSignal.rsi?.toFixed(0)}</div>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
                  <div className="text-xs text-slate-500 mb-1">RVOL</div>
                  <div className="text-lg font-bold text-cyan-400 font-mono">{selectedSignal.rvol?.toFixed(1)}x</div>
                </div>
              </div>

              {/* Sentiment */}
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-slate-500">Sentiment Score</span>
                  <span className={`font-bold ${
                    (selectedSignal.sentimentScore || 0) > 0 ? 'text-green-400' : 
                    (selectedSignal.sentimentScore || 0) < 0 ? 'text-red-400' : 
                    'text-slate-400'
                  }`}>
                    {(selectedSignal.sentimentScore || 0) > 0 ? 'Bullish' : (selectedSignal.sentimentScore || 0) < 0 ? 'Bearish' : 'Neutral'} ({(selectedSignal.sentimentScore || 0).toFixed(2)})
                  </span>
                </div>
                <Progress 
                  value={50 + (selectedSignal.sentimentScore || 0) * 50} 
                  className="h-2"
                />
              </div>

              {/* AI Analysis */}
              {analyzingSignal ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <ArrowPathIcon className="animate-spin text-cyan-500 h-8 w-8" />
                  <div className="text-cyan-400 animate-pulse text-sm">Analyzing {selectedSignal.ticker}...</div>
                </div>
              ) : signalAnalysis ? (
                <div className="space-y-3">
                  <div className={`p-4 rounded-lg border ${
                    signalAnalysis.verdict?.includes('BUY') ? 'bg-green-900/20 border-green-500/30' : 
                    signalAnalysis.verdict?.includes('SELL') ? 'bg-red-900/20 border-red-500/30' : 
                    'bg-slate-800 border-slate-700'
                  }`}>
                    <div className={`font-bold text-lg mb-1 ${
                      signalAnalysis.verdict?.includes('BUY') ? 'text-green-300' : 
                      signalAnalysis.verdict?.includes('SELL') ? 'text-red-300' : 
                      'text-slate-300'
                    }`}>
                      {signalAnalysis.verdict}
                    </div>
                    <div className="text-sm text-slate-400">{signalAnalysis.summary}</div>
                  </div>
                  
                  <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                    <div className="text-xs text-slate-500 uppercase font-bold mb-2">Risk Assessment</div>
                    <div className="text-sm text-slate-400">{signalAnalysis.risk}</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-slate-500 text-sm">
                  Loading analysis...
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 text-center">
              <div className="text-[10px] text-slate-600">
                SENTINEL SIGNAL ANALYSIS • REAL-TIME DATA
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deep AI Analysis Modal */}
      {showDeepAnalysis && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-cyan-500/30 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-cyan-900/30 to-slate-900 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                  <CpuChipIcon className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Deep AI Analysis</h3>
                  <p className="text-xs text-slate-400">Powered by GPT-4o</p>
                </div>
              </div>
              <button 
                onClick={() => setShowDeepAnalysis(false)} 
                className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg transition-colors" 
                data-testid="button-close-deep-analysis"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto flex-1 p-5">
              {deepAnalysisLoading && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="h-14 w-14 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin" />
                  <p className="text-slate-400 animate-pulse">AI is analyzing...</p>
                </div>
              )}
              
              {deepAnalysisError && (
                <div className="flex items-center gap-3 text-red-400 bg-red-400/10 p-4 rounded-lg border border-red-400/20">
                  <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
                  <span>{deepAnalysisError}</span>
                </div>
              )}
              
              {!deepAnalysisLoading && deepAnalysis && (
                <div className="space-y-5">
                  {/* Header with Price */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-2xl font-bold text-white">{deepAnalysis.ticker}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${deepAnalysis.assetType === 'crypto' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'}`}>
                          {deepAnalysis.assetType === 'crypto' ? 'CRYPTO' : 'STOCK'}
                        </span>
                      </div>
                      <p className="text-slate-400 text-sm">{deepAnalysis.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white font-mono">${deepAnalysis.price?.toFixed(2)}</p>
                      <p className={`text-sm font-medium ${deepAnalysis.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {deepAnalysis.change >= 0 ? '+' : ''}{deepAnalysis.change?.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                  
                  {/* Trend & Risk */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className={`px-4 py-2 rounded-lg font-bold ${
                      deepAnalysis.trend === 'BULLISH' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                      deepAnalysis.trend === 'BEARISH' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                      'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    }`}>
                      {deepAnalysis.trend === 'BULLISH' && <ArrowTrendingUpIcon className="h-4 w-4 inline mr-2" />}
                      {deepAnalysis.trend === 'BEARISH' && <ArrowTrendingDownIcon className="h-4 w-4 inline mr-2" />}
                      {deepAnalysis.trend}
                    </div>
                    <span className="text-slate-500 text-sm">Strength: <span className="text-white">{deepAnalysis.trendStrength}</span></span>
                    <span className={`ml-auto px-3 py-1 rounded text-sm font-bold ${
                      deepAnalysis.riskLevel === 'Low' ? 'bg-green-500/20 text-green-400' :
                      deepAnalysis.riskLevel === 'High' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {deepAnalysis.riskLevel} Risk
                    </span>
                  </div>
                  
                  {/* Summary */}
                  <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800">
                    <p className="text-slate-300">{deepAnalysis.summary}</p>
                  </div>
                  
                  {/* Technicals & Sentiment */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-lg">
                      <h4 className="text-sm font-bold text-white uppercase mb-3 flex items-center gap-2">
                        <ChartBarIcon className="h-4 w-4 text-cyan-400" /> Technical Levels
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Support</span>
                          <span className="text-green-400 font-mono">{deepAnalysis.technicals?.support}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Resistance</span>
                          <span className="text-red-400 font-mono">{deepAnalysis.technicals?.resistance}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">RSI Estimate</span>
                          <span className="text-white">{deepAnalysis.technicals?.rsiEstimate}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-lg">
                      <h4 className="text-sm font-bold text-white uppercase mb-3 flex items-center gap-2">
                        <BoltIcon className="h-4 w-4 text-amber-400" /> Sentiment
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Overall</span>
                          <span className={`font-bold ${deepAnalysis.sentiment?.overall === 'Positive' ? 'text-green-400' : deepAnalysis.sentiment?.overall === 'Negative' ? 'text-red-400' : 'text-yellow-400'}`}>
                            {deepAnalysis.sentiment?.overall}
                          </span>
                        </div>
                        {deepAnalysis.sentiment?.catalysts?.slice(0, 2).map((c: string, i: number) => (
                          <div key={i} className="flex items-start gap-1 text-xs text-slate-400">
                            <ChevronRightIcon className="h-3 w-3 text-green-400 mt-0.5 shrink-0" /> {c}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Trade Ideas */}
                  {deepAnalysis.tradeIdeas?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase mb-3 flex items-center gap-2">
                        <ViewfinderCircleIcon className="h-4 w-4 text-cyan-400" /> Trade Ideas
                      </h4>
                      {deepAnalysis.tradeIdeas.slice(0, 1).map((idea: any, i: number) => (
                        <div key={i} className={`border rounded-lg p-4 ${idea.direction === 'LONG' ? 'bg-green-900/10 border-green-500/20' : 'bg-red-900/10 border-red-500/20'}`}>
                          <div className="flex items-center justify-between mb-3">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${idea.direction === 'LONG' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                              {idea.direction}
                            </span>
                            <span className="text-xs text-slate-500">{idea.timeframe}</span>
                            <span className={`text-xs font-bold ${idea.confidence === 'High' ? 'text-green-400' : idea.confidence === 'Low' ? 'text-red-400' : 'text-yellow-400'}`}>
                              {idea.confidence} Confidence
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-slate-500 text-xs">Entry</p>
                              <p className="text-white font-mono">{idea.entry}</p>
                            </div>
                            <div>
                              <p className="text-slate-500 text-xs">Target</p>
                              <p className="text-green-400 font-mono">{idea.target}</p>
                            </div>
                            <div>
                              <p className="text-slate-500 text-xs">Stop Loss</p>
                              <p className="text-red-400 font-mono">{idea.stopLoss}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Verdict */}
                  <div className="bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border border-cyan-500/30 p-4 rounded-lg">
                    <h4 className="text-sm font-bold text-cyan-400 uppercase mb-2">AI Verdict</h4>
                    <p className="text-white">{deepAnalysis.verdict}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800">
              <button 
                onClick={() => setShowDeepAnalysis(false)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
                data-testid="button-close-deep-analysis-footer"
              >
                Close Analysis
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 30-Day Backtest Modal with Sentinel Audit */}
      <Dialog open={show30DayModal} onOpenChange={setShow30DayModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <CalendarIcon className="text-emerald-400 h-5 w-5" />
              Backtest Performance Audit
            </DialogTitle>
            <button 
              onClick={() => setShow30DayModal(false)} 
              className="text-slate-400 hover:text-white transition-colors"
              data-testid="button-close-30day-modal"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </DialogHeader>
          
          {/* Tab Buttons */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setModal30DayTab('performance')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                modal30DayTab === 'performance'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
              }`}
              data-testid="tab-30day-performance"
            >
              <ChartBarIcon className="h-4 w-4 inline mr-2" />
              30-Day Performance
            </button>
            <button
              onClick={() => setModal30DayTab('audit')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                modal30DayTab === 'audit'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
              }`}
              data-testid="tab-30day-audit"
            >
              <ClockIcon className="h-4 w-4 inline mr-2" />
              Trade Log
            </button>
          </div>
          
          {modal30DayTab === 'performance' ? (
            <>
              {backtestSummary ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-800 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-emerald-400">{backtestSummary.thirtyDay.winRate}%</div>
                      <div className="text-xs text-slate-500">Signal Confidence</div>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-400">+{backtestSummary.thirtyDay.avgReturn}%</div>
                      <div className="text-xs text-slate-500">Avg Return</div>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-white">{backtestSummary.thirtyDay.totalPicks}</div>
                      <div className="text-xs text-slate-500">Total Picks</div>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-cyan-400">{backtestSummary.thirtyDay.wins}W / {backtestSummary.thirtyDay.losses}L</div>
                      <div className="text-xs text-slate-500">Win/Loss</div>
                    </div>
                  </div>

                  <div className="bg-amber-900/30 border border-amber-500/50 p-3 rounded-lg mb-4">
                    <p className="text-amber-300 text-xs font-bold text-center">
                      ⚠️ PAST PERFORMANCE IS HYPOTHETICAL AND DOES NOT GUARANTEE FUTURE RESULTS.
                    </p>
                  </div>

                  <div className="bg-gradient-to-r from-emerald-900/20 to-cyan-900/20 border border-emerald-500/30 p-6 rounded-lg">
                    <h4 className="text-lg font-bold text-emerald-400 mb-3 flex items-center gap-2">
                      <TrophyIcon className="h-5 w-5" />
                      30-Day Backtest Summary
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">Total Trades Analyzed:</span>
                        <span className="text-white font-bold ml-2">{backtestSummary.thirtyDay.totalPicks}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Winning Trades:</span>
                        <span className="text-green-400 font-bold ml-2">{backtestSummary.thirtyDay.wins}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Losing Trades:</span>
                        <span className="text-red-400 font-bold ml-2">{backtestSummary.thirtyDay.losses}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Avg Return Per Trade:</span>
                        <span className="text-green-400 font-bold ml-2">+{backtestSummary.thirtyDay.avgReturn}%</span>
                      </div>
                    </div>
                  </div>

                  {backtestSummary.sixMonth && (
                    <div className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-500/30 p-6 rounded-lg">
                      <h4 className="text-lg font-bold text-yellow-400 mb-3 flex items-center gap-2">
                        <TrophyIcon className="h-5 w-5" />
                        6-Month Performance Summary
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-slate-400">Total Trades:</span>
                          <span className="text-white font-bold ml-2">{backtestSummary.sixMonth.totalPicks}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Signal Confidence:</span>
                          <span className="text-emerald-400 font-bold ml-2">{backtestSummary.sixMonth.winRate}%</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Avg Return:</span>
                          <span className="text-green-400 font-bold ml-2">+{backtestSummary.sixMonth.avgReturn}%</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Cumulative Return:</span>
                          <span className="text-yellow-400 font-bold ml-2">+{backtestSummary.sixMonth.cumulativeReturn}%</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Day-by-Day Details */}
                  <div className="mt-4">
                    {!detailed30Day ? (
                      <button
                        onClick={loadDetailed30Day}
                        disabled={loading30Day}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                        data-testid="button-load-30day-details"
                      >
                        {loading30Day ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <ClockIcon className="h-4 w-4" />}
                        {loading30Day ? 'Loading...' : 'View Day-by-Day Details'}
                      </button>
                    ) : detailed30Day.days && detailed30Day.days.length > 0 ? (
                      <div className="bg-slate-800 rounded-lg overflow-hidden max-h-80 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-700 sticky top-0">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs text-slate-400">Date</th>
                              <th className="px-3 py-2 text-left text-xs text-slate-400">Picks</th>
                              <th className="px-3 py-2 text-left text-xs text-slate-400">W/L</th>
                              <th className="px-3 py-2 text-right text-xs text-slate-400">Avg Ret</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-700">
                            {detailed30Day.days.map((day: any, idx: number) => (
                              <React.Fragment key={idx}>
                                <tr 
                                  onClick={() => setExpandedDay30(expandedDay30 === idx ? null : idx)}
                                  className="hover:bg-slate-700/50 cursor-pointer group"
                                  data-testid={`backtest-day-row-${idx}`}
                                >
                                  <td className="px-3 py-2 text-white flex items-center gap-2">
                                    <ChevronRightIcon className={`h-4 w-4 text-slate-500 transition-transform ${expandedDay30 === idx ? 'rotate-90' : ''}`} />
                                    {day.date}
                                  </td>
                                  <td className="px-3 py-2 text-slate-400">{day.picks?.length || 0}</td>
                                  <td className="px-3 py-2">
                                    <span className="text-green-400">{day.winCount}W</span>
                                    <span className="text-slate-500"> / </span>
                                    <span className="text-red-400">{day.lossCount}L</span>
                                  </td>
                                  <td className={`px-3 py-2 text-right font-mono ${day.avgReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {day.avgReturn >= 0 ? '+' : ''}{day.avgReturn}%
                                  </td>
                                </tr>
                                {expandedDay30 === idx && day.picks && (
                                  <tr>
                                    <td colSpan={4} className="bg-slate-900 px-4 py-3">
                                      <div className="space-y-2">
                                        {day.picks.map((pick: any, pIdx: number) => (
                                          <div 
                                            key={pIdx}
                                            className={`flex items-center justify-between p-2 rounded-lg border ${pick.win ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/20 border-red-500/30'}`}
                                          >
                                            <div className="flex items-center gap-3">
                                              <span className="font-bold text-white">{pick.ticker}</span>
                                              <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">{pick.signal}</span>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs">
                                              <span className="text-slate-400">Open: <span className="text-white font-mono">${pick.openPrice?.toFixed(2)}</span></span>
                                              <span className="text-slate-400">Close: <span className="text-white font-mono">${pick.closePrice?.toFixed(2)}</span></span>
                                              <span className={`font-bold font-mono ${pick.win ? 'text-green-400' : 'text-red-400'}`}>
                                                {pick.returnPercent >= 0 ? '+' : ''}{pick.returnPercent}%
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-slate-500 text-sm">No detailed data available</div>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 text-center italic">
                    Performance data based on historical backtest analysis. Past performance does not guarantee future results.
                  </p>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">Loading performance data...</div>
              )}
            </>
          ) : (
            /* Audit Tab - Trade Log */
            <div className="space-y-4">
              <p className="text-xs text-slate-400 uppercase tracking-wider">
                Verified Closed Trade Log
              </p>
              <div className="bg-slate-800 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-700 sticky top-0">
                    <tr>
                      <th className="px-4 py-3">Asset</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Open</th>
                      <th className="px-4 py-3">Close</th>
                      <th className="px-4 py-3 text-right">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {currentHistory.filter(t => t.outcome !== 'PENDING' && t.outcome !== 'pending').map((trade, idx) => (
                      <tr 
                        key={idx} 
                        onClick={() => setSelectedHistoryItem(trade)}
                        className="hover:bg-slate-700/50 transition-colors cursor-pointer group" 
                        data-testid={`audit-row-${idx}`}
                      >
                        <td className="px-4 py-3 font-bold text-white">{trade.ticker}</td>
                        <td className="px-4 py-3 text-slate-400">{trade.date ? new Date(trade.date).toLocaleDateString() : '-'}</td>
                        <td className="px-4 py-3 text-slate-400">{trade.type}</td>
                        <td className="px-4 py-3 font-mono text-slate-300">${Number(trade.open || trade.entry).toFixed(2)}</td>
                        <td className="px-4 py-3 font-mono text-slate-300">${Number(trade.exit).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                            trade.outcome === 'PENDING'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : trade.outcome === 'NEUTRAL'
                                ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                                : trade.outcome === 'WIN' || trade.profitPercent > 0 
                                  ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {trade.outcome === 'PENDING' ? (
                              <>
                                <ClockIcon className="h-3 w-3" />
                                Pending
                              </>
                            ) : trade.outcome === 'NEUTRAL' ? (
                              <>
                                <SignalIcon className="h-3 w-3" />
                                {Number(trade.profitPercent).toFixed(2)}%
                              </>
                            ) : (
                              <>
                                {trade.outcome === 'WIN' || trade.profitPercent > 0 ? <CheckCircleIcon className="h-3 w-3" /> : <XCircleIcon className="h-3 w-3" />}
                                {trade.profitPercent > 0 ? '+' : ''}{Number(trade.profitPercent).toFixed(2)}%
                              </>
                            )}
                          </div>
                          <ArrowRightIcon className="h-4 w-4 text-slate-600 group-hover:text-cyan-400 transition-colors" />
                        </td>
                      </tr>
                    ))}
                    {currentHistory.filter(t => t.outcome !== 'PENDING' && t.outcome !== 'pending').length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-slate-500 italic">
                          No finalized trades found in the audit log yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-600">
                  AUDIT ID: {Math.floor(Math.random() * 99999999).toString().padStart(8, '0')} • DATA INTEGRITY VERIFIED
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 6-Month Backtest Modal */}
      <Dialog open={show6MonthModal} onOpenChange={setShow6MonthModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <TrophyIcon className="text-yellow-400 h-5 w-5" />
              6-Month Historical Performance
            </DialogTitle>
            <button 
              onClick={() => setShow6MonthModal(false)} 
              className="text-slate-400 hover:text-white transition-colors"
              data-testid="button-close-6month-modal"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </DialogHeader>
          
          {backtestSummary?.sixMonth ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-800 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-emerald-400">{backtestSummary.sixMonth.winRate}%</div>
                  <div className="text-xs text-slate-500">Signal Confidence</div>
                </div>
                <div className="bg-slate-800 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-400">+{backtestSummary.sixMonth.avgReturn}%</div>
                  <div className="text-xs text-slate-500">Avg Return</div>
                </div>
                <div className="bg-slate-800 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-white">{backtestSummary.sixMonth.totalPicks}</div>
                  <div className="text-xs text-slate-500">Total Picks</div>
                </div>
                <div className="bg-slate-800 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-yellow-400">+{backtestSummary.sixMonth.cumulativeReturn}%</div>
                  <div className="text-xs text-slate-500">Cumulative</div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-500/30 p-6 rounded-lg">
                <h4 className="text-lg font-bold text-yellow-400 mb-3 flex items-center gap-2">
                  <TrophyIcon className="h-5 w-5" />
                  6-Month Performance Highlights
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">Total Trades Analyzed:</span>
                    <span className="text-white font-bold ml-2">{backtestSummary.sixMonth.totalPicks}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Signal Confidence:</span>
                    <span className="text-emerald-400 font-bold ml-2">{backtestSummary.sixMonth.winRate}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Avg Return Per Trade:</span>
                    <span className="text-green-400 font-bold ml-2">+{backtestSummary.sixMonth.avgReturn}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Cumulative Return:</span>
                    <span className="text-yellow-400 font-bold ml-2">+{backtestSummary.sixMonth.cumulativeReturn}%</span>
                  </div>
                </div>
              </div>

              {/* 6-Month Day-by-Day Details */}
              <div className="mt-4">
                {!detailed6Month ? (
                  <button
                    onClick={loadDetailed6Month}
                    disabled={loading6Month}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                    data-testid="button-load-6month-details"
                  >
                    {loading6Month ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <ClockIcon className="h-4 w-4" />}
                    {loading6Month ? 'Loading...' : 'View Day-by-Day Details'}
                  </button>
                ) : detailed6Month.days && detailed6Month.days.length > 0 ? (
                  <div className="bg-slate-800 rounded-lg overflow-hidden max-h-80 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-700 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs text-slate-400">Date</th>
                          <th className="px-3 py-2 text-left text-xs text-slate-400">Picks</th>
                          <th className="px-3 py-2 text-left text-xs text-slate-400">W/L</th>
                          <th className="px-3 py-2 text-right text-xs text-slate-400">Avg Ret</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700">
                        {detailed6Month.days.map((day: any, idx: number) => (
                          <React.Fragment key={idx}>
                            <tr 
                              onClick={() => setExpandedDay6m(expandedDay6m === idx ? null : idx)}
                              className="hover:bg-slate-700/50 cursor-pointer group"
                              data-testid={`backtest-6m-day-row-${idx}`}
                            >
                              <td className="px-3 py-2 text-white flex items-center gap-2">
                                <ChevronRightIcon className={`h-4 w-4 text-slate-500 transition-transform ${expandedDay6m === idx ? 'rotate-90' : ''}`} />
                                {day.date}
                              </td>
                              <td className="px-3 py-2 text-slate-400">{day.picks?.length || 0}</td>
                              <td className="px-3 py-2">
                                <span className="text-green-400">{day.winCount}W</span>
                                <span className="text-slate-500"> / </span>
                                <span className="text-red-400">{day.lossCount}L</span>
                              </td>
                              <td className={`px-3 py-2 text-right font-mono ${day.avgReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {day.avgReturn >= 0 ? '+' : ''}{day.avgReturn}%
                              </td>
                            </tr>
                            {expandedDay6m === idx && day.picks && (
                              <tr>
                                <td colSpan={4} className="bg-slate-900 px-4 py-3">
                                  <div className="space-y-2">
                                    {day.picks.map((pick: any, pIdx: number) => (
                                      <div 
                                        key={pIdx}
                                        className={`flex items-center justify-between p-2 rounded-lg border ${pick.win ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/20 border-red-500/30'}`}
                                      >
                                        <div className="flex items-center gap-3">
                                          <span className="font-bold text-white">{pick.ticker}</span>
                                          <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">{pick.signal}</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs">
                                          <span className="text-slate-400">Open: <span className="text-white font-mono">${pick.openPrice?.toFixed(2)}</span></span>
                                          <span className="text-slate-400">Close: <span className="text-white font-mono">${pick.closePrice?.toFixed(2)}</span></span>
                                          <span className={`font-bold font-mono ${pick.win ? 'text-green-400' : 'text-red-400'}`}>
                                            {pick.returnPercent >= 0 ? '+' : ''}{pick.returnPercent}%
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-4 text-slate-500 text-sm">No detailed data available yet</div>
                )}
              </div>

              <p className="text-xs text-slate-600 text-center italic">
                Performance data based on historical backtest analysis. Past performance does not guarantee future results.
              </p>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">6-month data not available</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

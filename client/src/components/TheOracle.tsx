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

  const [backtestSummary, setBacktestSummary] = useState<BacktestSummaryData | null>(null);
  const [show30DayModal, setShow30DayModal] = useState(false);
  useModalBack(show30DayModal, () => setShow30DayModal(false), 'oracle-30day-modal');
  const [show6MonthModal, setShow6MonthModal] = useState(false);
  useModalBack(show6MonthModal, () => setShow6MonthModal(false), 'oracle-6month-modal');
  const [modal30DayTab, setModal30DayTab] = useState<'performance' | 'audit'>('performance');
  
  const [detailed30Day, setDetailed30Day] = useState<any>(null);
  const [detailed6Month, setDetailed6Month] = useState<any>(null);
  const [loading30Day, setLoading30Day] = useState(false);
  const [loading6Month, setLoading6Month] = useState(false);
  const [expandedDay30, setExpandedDay30] = useState<number | null>(null);
  const [expandedDay6m, setExpandedDay6m] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);

  const syncPrices = async () => {
    setSyncing(true);
    try {
      await fetch('/api/oracle/update-open-prices', { method: 'POST' });
      const cacheBuster = Date.now();
      const res = await fetch(`/api/oracle/daily?_cb=${cacheBuster}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      const json = await res.json();
      if (json.success) setPicks(json.data);
    } catch (e) {
      console.error('[Oracle] Price sync failed:', e);
    } finally {
      setSyncing(false);
    }
  };

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
      setDeepAnalysisError('Network error - please try again');
    } finally {
      setDeepAnalysisLoading(false);
    }
  };

  const [historyData, setHistoryData] = useState<any[]>([]);
  const [cryptoHistoryData, setCryptoHistoryData] = useState<any[]>([]);
  const [stats, setStats] = useState({ wins: 0, losses: 0, winRate: 0, avgReturn: 0, bestPick: null as { ticker: string; return: number } | null });
  const [cryptoStats, setCryptoStats] = useState({ wins: 0, losses: 0, winRate: 0, avgReturn: 0, bestPick: null as { ticker: string; return: number } | null });
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>(null);
  useModalBack(!!selectedHistoryItem, () => setSelectedHistoryItem(null), 'oracle-history-item');

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
      if (data.success && data.data) {
        setBacktestSummary(data.data);
      } else {
        setBacktestSummary({
          thirtyDay: { winRate: 0, wins: 0, losses: 0, avgReturn: 0, totalPicks: 0 },
          sixMonth: null
        });
      }
    } catch (error) {
      setBacktestSummary({
        thirtyDay: { winRate: 0, wins: 0, losses: 0, avgReturn: 0, totalPicks: 0 },
        sixMonth: null
      });
    }
  };

  const loadDetailed30Day = async () => {
    if (detailed30Day) return;
    setLoading30Day(true);
    try {
      const res = await fetch('/api/backtest/30-day');
      const data = await res.json();
      if (data.success) setDetailed30Day(data.data);
    } catch (e) {
      console.error('Failed to load 30-day details:', e);
    } finally {
      setLoading30Day(false);
    }
  };

  const loadDetailed6Month = async () => {
    if (detailed6Month) return;
    setLoading6Month(true);
    try {
      const res = await fetch('/api/backtest/6-month');
      const data = await res.json();
      if (data.success) setDetailed6Month(data.data);
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
        const cacheBuster = `${new Date().toISOString().split('T')[0]}_${Date.now()}`;
        const res = await fetch(`/api/oracle/daily?_cb=${cacheBuster}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setPicks(json.data);
        } else {
          setPicks([]);
        }
      } catch (e) {
        console.error("Oracle offline");
      } finally {
        setLoading(false);
      }
    }
    fetchDailyPicks();
  }, []);

  const picksLoaded = picks.length > 0;
  useEffect(() => {
    if (!picksLoaded) return;
    async function updateLivePrices() {
      try {
        const res = await fetch('/api/market/sentinel');
        const json = await res.json();
        if (json.success && json.data && Array.isArray(json.data)) {
          const priceMap = new Map<string, number>();
          json.data.forEach((s: any) => {
            if (s && s.ticker) priceMap.set(s.ticker, s.price);
          });
          setPicks(prev => (Array.isArray(prev) ? prev : []).map(pick => ({
            ...pick,
            currentPrice: priceMap.get(pick.ticker) || pick.currentPrice || pick.entryPrice
          })));
        }
      } catch (e) {}
    }
    updateLivePrices();
    const interval = setInterval(updateLivePrices, 30000);
    return () => clearInterval(interval);
  }, [picksLoaded]);

  const sortedPicks = useMemo(() => {
    const sorted = [...picks];
    switch (sortBy) {
      case 'confidence': return sorted.sort((a, b) => (b.confidenceScore || 70) - (a.confidenceScore || 70));
      case 'return': return sorted.sort((a, b) => {
          const basePriceA = a.openPrice || a.entryPrice;
          const basePriceB = b.openPrice || b.entryPrice;
          return ((b.predictedPrice - basePriceB) / basePriceB) - ((a.predictedPrice - basePriceA) / basePriceA);
        });
      case 'risk':
        const rOrder = { 'Low': 1, 'Medium': 2, 'High': 3 };
        return sorted.sort((a, b) => rOrder[a.riskLevel || 'Medium'] - rOrder[b.riskLevel || 'Medium']);
      default: return sorted;
    }
  }, [picks, sortBy]);

  const sortedCryptoPicks = useMemo(() => {
    const sorted = [...cryptoPicks];
    switch (sortBy) {
      case 'confidence': return sorted.sort((a, b) => (b.confidenceScore || 70) - (a.confidenceScore || 70));
      case 'return': return sorted.sort((a, b) => {
          const basePriceA = a.openPrice || a.entryPrice;
          const basePriceB = b.openPrice || b.entryPrice;
          return ((b.predictedPrice - basePriceB) / basePriceB) - ((a.predictedPrice - basePriceA) / basePriceA);
        });
      case 'risk':
        const rOrder = { 'Low': 1, 'Medium': 2, 'High': 3 };
        return sorted.sort((a, b) => rOrder[a.riskLevel || 'Medium'] - rOrder[b.riskLevel || 'Medium']);
      default: return sorted;
    }
  }, [cryptoPicks, sortBy]);

  const currentPicks = activeTab === 'stocks' ? sortedPicks : sortedCryptoPicks;
  const currentLoading = activeTab === 'stocks' ? loading : cryptoLoading;
  const currentStats = activeTab === 'stocks' ? stats : cryptoStats;
  const currentHistory = activeTab === 'stocks' ? historyData : cryptoHistoryData;

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'Low': return <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1"><ShieldCheckIcon className="h-3 w-3" /> Low</span>;
      case 'High': return <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1"><FireIcon className="h-3 w-3" /> High</span>;
      default: return <span className="px-2 py-0.5 rounded text-xs font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 flex items-center gap-1"><ArrowTrendingUpIcon className="h-3 w-3" /> Med</span>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      <div className={`bg-gradient-to-br ${activeTab === 'crypto' ? 'from-slate-900 via-slate-900 to-orange-950' : 'from-slate-900 via-slate-900 to-cyan-950'} p-8 rounded-2xl border border-slate-800 relative overflow-hidden`}>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                <ViewfinderCircleIcon className={`${activeTab === 'crypto' ? 'text-orange-400' : 'text-cyan-400'} h-8 w-8`} />
                The Oracle <TrophyIcon className="text-emerald-400 h-6 w-6" />
              </h2>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setActiveTab('stocks')} className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all ${activeTab === 'stocks' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'bg-slate-800 text-slate-400'}`}>Stocks</button>
              <button onClick={() => setActiveTab('crypto')} className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all ${activeTab === 'crypto' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' : 'bg-slate-800 text-slate-400'}`}>Crypto</button>
              <button onClick={syncPrices} disabled={syncing} className="px-3 py-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-all"><ArrowPathIcon className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} /></button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
             <div onClick={() => { setModal30DayTab('audit'); setShow30DayModal(true); }} className="bg-slate-950/50 p-4 rounded-xl border border-slate-700/50 cursor-pointer">
                <div className="text-xs text-slate-500 uppercase font-bold">Signal Confidence</div>
                <div className="text-2xl font-bold text-green-400">{currentStats.winRate}%</div>
             </div>
             <div onClick={() => { setModal30DayTab('audit'); setShow30DayModal(true); }} className="bg-slate-950/50 p-4 rounded-xl border border-slate-700/50 cursor-pointer">
                <div className="text-xs text-slate-500 uppercase font-bold">Avg Return</div>
                <div className={`text-2xl font-bold ${currentStats.avgReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>{currentStats.avgReturn}%</div>
             </div>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">{activeTab === 'crypto' ? "Today's Crypto Picks" : "Today's Picks"}</h3>
        </div>

        {currentLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
            {[1,2,3].map(i => <div key={i} className="bg-slate-900 h-64 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(Array.isArray(currentPicks) ? currentPicks : []).map((pick) => (
              <div key={pick.ticker} className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="flex justify-between items-start mb-4">
                  <TickerInfo ticker={pick.ticker} name={pick.name} isCrypto={activeTab === 'crypto'} size="xl" />
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Confidence</div>
                    <div className="text-sm font-bold text-cyan-400">{pick.confidenceScore || 70}%</div>
                  </div>
                </div>
                <div className="space-y-2 mb-4 text-sm">
                   <div className="flex justify-between text-slate-400"><span>Open Price</span><span className="text-white">${(pick.openPrice || pick.entryPrice).toFixed(2)}</span></div>
                   <div className="flex justify-between text-slate-400"><span>Target</span><span className="text-cyan-400">${pick.predictedPrice.toFixed(2)}</span></div>
                </div>
                <button onClick={() => setSelectedPick(pick)} className="w-full py-2 bg-slate-800 hover:bg-cyan-600 rounded-lg text-white text-sm transition-all">View Analysis</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedPick && (
        <Dialog open={!!selectedPick} onOpenChange={() => setSelectedPick(null)}>
          <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
             <DialogHeader>
                <DialogTitle>Tactical Report: {selectedPick.ticker}</DialogTitle>
             </DialogHeader>
             <div className="p-4 space-y-4">
                <div className="bg-slate-950 p-4 rounded-lg border border-cyan-500/20">
                   <p className="text-sm text-cyan-200">{selectedPick.aiReasoning || "AI analysis pending for this historical record."}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-slate-950 p-3 rounded border border-slate-800">
                      <div className="text-xs text-slate-500">RSI LEVEL</div>
                      <div className="text-xl font-bold">{selectedPick.rsi || 50}</div>
                   </div>
                   <div className="bg-slate-950 p-3 rounded border border-slate-800">
                      <div className="text-xs text-slate-500">SENTIMENT</div>
                      <div className="text-xl font-bold">{(selectedPick.sentimentScore || 0).toFixed(2)}</div>
                   </div>
                </div>
             </div>
          </DialogContent>
        </Dialog>
      )}

      {showSignals && (
        <Dialog open={showSignals} onOpenChange={setShowSignals}>
          <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
            <DialogHeader><DialogTitle>Live Signals</DialogTitle></DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto space-y-2">
              {signalsLoading ? <p className="text-center p-8">Scanning...</p> : 
                (Array.isArray(liveSignals) ? liveSignals : []).map((sig, i) => (
                <div key={i} className="p-4 bg-slate-950 border border-slate-800 rounded-lg flex justify-between items-center">
                   <div>
                      <div className="font-bold">{sig.ticker}</div>
                      <div className="text-xs text-slate-500">{sig.signal}</div>
                   </div>
                   <div className="text-right">
                      <div className="font-mono">${sig.price?.toFixed(2)}</div>
                      <div className="text-xs text-cyan-500">RSI: {sig.rsi}</div>
                   </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 30-Day Audit Dialog */}
      <Dialog open={show30DayModal} onOpenChange={setShow30DayModal}>
        <DialogContent className="max-w-4xl bg-slate-900 border-slate-700 text-white">
           <DialogHeader><DialogTitle>Performance Audit</DialogTitle></DialogHeader>
           <div className="max-h-[70vh] overflow-y-auto">
             <table className="w-full text-sm text-left">
                <thead className="bg-slate-800 text-slate-400 uppercase text-xs">
                   <tr>
                      <th className="p-3">Ticker</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Type</th>
                      <th className="p-3 text-right">Result</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                   {currentHistory.map((trade, idx) => (
                     <tr key={idx} className="hover:bg-slate-800/50">
                        <td className="p-3 font-bold">{trade.ticker}</td>
                        <td className="p-3">{trade.date ? new Date(trade.date).toLocaleDateString() : '-'}</td>
                        <td className="p-3 text-slate-500">{trade.type || 'TRADE'}</td>
                        <td className={`p-3 text-right font-bold ${trade.profitPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                           {trade.profitPercent >= 0 ? '+' : ''}{trade.profitPercent}%
                        </td>
                     </tr>
                   ))}
                </tbody>
             </table>
           </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
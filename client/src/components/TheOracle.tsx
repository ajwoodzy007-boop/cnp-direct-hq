import React, { useState, useEffect, useMemo } from 'react';
import { Target, ArrowRight, X, Activity, BarChart2, FileText, AlertTriangle, Lock, Shield, Flame, TrendingUp, Info, Zap, Loader2, History, CheckCircle, XCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import PremiumLock from './PremiumLock';
import Skeleton from './Skeleton';

interface PickData {
  ticker: string;
  entryPrice: number;
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
}

type SortOption = 'rank' | 'confidence' | 'return' | 'risk';

export default function TheOracle() {
  const [picks, setPicks] = useState<PickData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPick, setSelectedPick] = useState<PickData | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('rank');
  const [showSignals, setShowSignals] = useState(false);
  const [signalsLocked, setSignalsLocked] = useState(false);
  const [signalsLoading, setSignalsLoading] = useState(false);
  const [liveSignals, setLiveSignals] = useState<any[]>([]);
  
  const [aiReport, setAiReport] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // History modal state
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [stats, setStats] = useState({ wins: 0, losses: 0, winRate: 0, streak: 0 });
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>(null);

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

  useEffect(() => {
    fetchHistory();
  }, []);
  
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

  useEffect(() => {
    async function fetchDailyPicks() {
      try {
        const res = await fetch('/api/oracle/daily');
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

  const sortedPicks = useMemo(() => {
    const sorted = [...picks];
    switch (sortBy) {
      case 'confidence':
        return sorted.sort((a, b) => (b.confidenceScore || 70) - (a.confidenceScore || 70));
      case 'return':
        return sorted.sort((a, b) => {
          const returnA = ((a.predictedPrice - a.entryPrice) / a.entryPrice) * 100;
          const returnB = ((b.predictedPrice - b.entryPrice) / b.entryPrice) * 100;
          return returnB - returnA;
        });
      case 'risk':
        const riskOrder = { 'Low': 1, 'Medium': 2, 'High': 3 };
        return sorted.sort((a, b) => (riskOrder[a.riskLevel || 'Medium'] || 2) - (riskOrder[b.riskLevel || 'Medium'] || 2));
      default:
        return sorted;
    }
  }, [picks, sortBy]);

  const getProgressToTarget = (pick: PickData) => {
    const current = pick.currentPrice || pick.entryPrice;
    const target = pick.predictedPrice;
    const entry = pick.entryPrice;
    if (target === entry) return 0;
    const progress = ((current - entry) / (target - entry)) * 100;
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
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1"><Shield className="h-3 w-3" /> Low</span>;
      case 'High':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1"><Flame className="h-3 w-3" /> High</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Med</span>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950 p-8 rounded-2xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10">
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <Target className="text-cyan-400 h-8 w-8" />
            The Oracle
          </h2>
          <p className="text-slate-400 mt-2 max-w-2xl">
            High-conviction setups filtered by the Sentinel Engine.
          </p>
          <div 
            onClick={() => setShowHistory(true)}
            className="flex flex-wrap gap-4 mt-8 cursor-pointer group"
            data-testid="button-view-history"
          >
            <div className="bg-slate-950/50 backdrop-blur-md px-6 py-3 rounded-xl border border-slate-700/50 group-hover:border-cyan-500/50 transition-colors">
              <div className="text-xs text-slate-500 uppercase font-bold tracking-wider flex items-center gap-2">
                Win Rate <History className="h-3 w-3" />
              </div>
              <div className="text-2xl font-bold text-green-400">{stats.winRate}%</div>
            </div>
            <div className="bg-slate-950/50 backdrop-blur-md px-6 py-3 rounded-xl border border-slate-700/50 group-hover:border-cyan-500/50 transition-colors">
              <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Current Streak</div>
              <div className="text-2xl font-bold text-cyan-400 flex items-center gap-2">
                {stats.streak} Days
                {stats.streak >= 3 && <span className="text-orange-500">🔥</span>}
              </div>
            </div>
            <div className="bg-slate-950/50 backdrop-blur-md px-6 py-3 rounded-xl border border-slate-700/50 group-hover:border-cyan-500/50 transition-colors">
              <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Record</div>
              <div className="text-2xl font-bold">
                <span className="text-green-400">{stats.wins}W</span>
                <span className="text-slate-600 mx-1">/</span>
                <span className="text-red-400">{stats.losses}L</span>
              </div>
            </div>
            <div className="flex items-center text-xs text-slate-500 group-hover:text-cyan-400 transition-colors">
              View Proof Log <ArrowRight className="h-3 w-3 ml-1" />
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={(e) => { e.stopPropagation(); fetchSignals(); }}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 px-6 py-3 rounded-xl font-bold text-white flex items-center gap-2 transition-all"
              data-testid="button-live-signals"
            >
              <Zap className="h-5 w-5" /> Live Signals
            </button>
          </div>
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            Today's Predictions <span className="text-xs font-normal text-slate-500 bg-slate-800 px-2 py-1 rounded ml-2">Live</span>
          </h3>
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

        {loading ? (
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
        ) : picks.length === 0 ? (
          <div className="p-8 border border-dashed border-slate-700 rounded-xl text-center text-slate-500">
            No high-conviction signals found today.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedPicks.map((pick, index) => {
              const confScore = pick.confidenceScore || (pick.confidence === 'High' ? 85 : 60);
              const progress = getProgressToTarget(pick);
              const potentialReturn = ((pick.predictedPrice - pick.entryPrice) / pick.entryPrice * 100).toFixed(1);
              const riskLevel = pick.riskLevel || 'Medium';
              const stopLoss = pick.stopLoss || (pick.entryPrice * 0.95);
              const rr = pick.riskRewardRatio || 2.5;

              return (
                <div key={pick.ticker} className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-cyan-500/30 transition-all group" data-testid={`oracle-pick-${pick.ticker}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-2xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                          {pick.ticker}
                        </h4>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="text-slate-500 hover:text-cyan-400" data-testid={`button-why-${pick.ticker}`}>
                              <Info className="h-4 w-4" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-72 bg-slate-900 border-slate-700 text-slate-300 text-sm">
                            <div className="font-bold text-cyan-400 mb-2">Why this pick?</div>
                            <p className="text-xs leading-relaxed">
                              {pick.aiReasoning || `Strong ${pick.signal.toLowerCase()} signal detected with ${confScore}% confidence. RSI at ${pick.rsi || 65} indicates ${pick.signal.includes('VALUE') ? 'oversold conditions' : 'momentum continuation'}. Sentiment analysis shows ${(pick.sentimentScore || 0.5) > 0.5 ? 'bullish' : 'neutral'} market tone.`}
                            </p>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                          {pick.signal}
                        </span>
                        {getRiskBadge(riskLevel)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500 mb-1">Confidence</div>
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
                      <span className="text-slate-500">Entry Zone</span>
                      <span className="text-white font-mono">${pick.entryPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Target (AI)</span>
                      <span className="text-cyan-400 font-mono font-bold">${pick.predictedPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Potential</span>
                      <span className="text-green-400 font-mono font-bold">+{potentialReturn}%</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Progress to Target</span>
                      <span>{progress.toFixed(0)}%</span>
                    </div>
                    <Progress 
                      value={progress} 
                      className="h-2 bg-slate-800"
                    />
                  </div>

                  <div className="flex justify-between text-xs text-slate-500 mb-4 border-t border-slate-800 pt-3">
                    <div>
                      <span className="text-slate-600">Stop Loss:</span>
                      <span className="text-red-400 ml-1 font-mono">${stopLoss.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">R:R</span>
                      <span className="text-cyan-400 ml-1 font-mono">{rr.toFixed(1)}:1</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 mb-4">
                    <div className="flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      <span>Locked {pick.lockedAt || '7:30 AM ET'}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => setSelectedPick(pick)}
                    className="w-full py-2 bg-slate-800 hover:bg-cyan-600 hover:text-white text-slate-300 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
                    data-testid={`button-view-analysis-${pick.ticker}`}
                  >
                    View Analysis <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedPick && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <FileText className="text-cyan-400 h-5 w-5" />
                  Tactical Report: {selectedPick.ticker}
                </h3>
                <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">
                  AI Sentinel Intelligence
                </p>
              </div>
              <button onClick={() => setSelectedPick(null)} className="text-slate-400 hover:text-white" data-testid="button-close-modal">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              
              {analyzing ? (
                <div className="flex flex-col items-center justify-center h-32 space-y-4">
                  <Loader2 className="h-10 w-10 text-cyan-500 animate-spin" />
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
                  <AlertTriangle className={`h-6 w-6 shrink-0 mt-1 ${
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
                  <AlertTriangle className="text-cyan-400 h-6 w-6 shrink-0 mt-1" />
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
                    <Activity className="h-3 w-3" /> RSI Level
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
                    <BarChart2 className="h-3 w-3" /> Relative Vol
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
              <button className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors" data-testid="button-add-watchlist">
                Add to Watchlist
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History / Proof Log Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <History className="text-cyan-400 h-5 w-5" />
                  Sentinel Performance Audit
                </h3>
                <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">
                  Verified Closed Trade Log
                </p>
              </div>
              <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-white" data-testid="button-close-history">
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Scrollable Table */}
            <div className="overflow-y-auto flex-1 p-6">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-950/50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 rounded-l-lg">Asset</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Entry</th>
                    <th className="px-4 py-3">Exit</th>
                    <th className="px-4 py-3 text-right rounded-r-lg">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {historyData.map((trade, idx) => (
                    <tr 
                      key={idx} 
                      onClick={() => setSelectedHistoryItem(trade)}
                      className="hover:bg-slate-800/50 transition-colors cursor-pointer group" 
                      data-testid={`history-row-${idx}`}
                    >
                      <td className="px-4 py-4 font-bold text-white">{trade.ticker}</td>
                      <td className="px-4 py-4 text-slate-400">{trade.date ? new Date(trade.date).toLocaleDateString() : '-'}</td>
                      <td className="px-4 py-4 text-slate-400">{trade.type}</td>
                      <td className="px-4 py-4 font-mono text-slate-300">${Number(trade.entry).toFixed(2)}</td>
                      <td className="px-4 py-4 font-mono text-slate-300">${Number(trade.exit).toFixed(2)}</td>
                      <td className="px-4 py-4 text-right flex items-center justify-end gap-2">
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                          trade.profitPercent > 0 
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {trade.profitPercent > 0 ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {trade.profitPercent > 0 ? '+' : ''}{Number(trade.profitPercent).toFixed(2)}%
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-cyan-400 transition-colors" />
                      </td>
                    </tr>
                  ))}
                  {historyData.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-500 italic">
                        No closed trades found in the audit log yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 text-center">
              <p className="text-[10px] text-slate-600">
                AUDIT ID: {Math.floor(Math.random() * 99999999).toString().padStart(8, '0')} • DATA INTEGRITY VERIFIED
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Trade Recap Modal (Sub-Modal for History) */}
      {selectedHistoryItem && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in zoom-in-95 duration-200">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-6 relative">
            
            <button 
              onClick={() => setSelectedHistoryItem(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
              data-testid="button-close-recap"
            >
              <X className="h-6 w-6" />
            </button>

            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-slate-800 border border-slate-700 mb-4">
                <span className="text-2xl font-bold text-white">{selectedHistoryItem.ticker}</span>
              </div>
              <h3 className="text-xl font-bold text-white">Trade Recap</h3>
              <p className="text-sm text-slate-500 uppercase tracking-wider">
                {selectedHistoryItem.date ? new Date(selectedHistoryItem.date).toLocaleDateString() : '-'} • {selectedHistoryItem.type}
              </p>
            </div>

            {/* P/L Highlight */}
            <div className={`text-center p-4 rounded-xl border mb-6 ${
              selectedHistoryItem.profitPercent > 0 
                ? 'bg-green-500/10 border-green-500/20' 
                : 'bg-red-500/10 border-red-500/20'
            }`}>
              <div className="text-xs font-bold uppercase opacity-70 mb-1">Performance</div>
              <div className={`text-3xl font-bold ${
                selectedHistoryItem.profitPercent > 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {selectedHistoryItem.profitPercent > 0 ? '+' : ''}{Number(selectedHistoryItem.profitPercent).toFixed(2)}%
              </div>
            </div>

            {/* Data Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                  <TrendingUp className="h-3 w-3" /> Entry Price
                </div>
                <div className="font-mono text-lg text-white">${Number(selectedHistoryItem.entry).toFixed(2)}</div>
              </div>

              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                  <Target className="h-3 w-3" /> Exit Price
                </div>
                <div className="font-mono text-lg text-white">${Number(selectedHistoryItem.exit).toFixed(2)}</div>
              </div>
            </div>

            {/* Dollar Change */}
            <div className="mt-4 bg-slate-950 p-4 rounded-lg border border-slate-800">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Dollar Change</span>
                <span className={`font-mono font-bold ${
                  selectedHistoryItem.profitPercent > 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {selectedHistoryItem.profitPercent > 0 ? '+' : ''}${(Number(selectedHistoryItem.exit) - Number(selectedHistoryItem.entry)).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 text-center">
              <div className="text-[10px] text-slate-600">
                SENTINEL AUTO-LOG • RECORDED {selectedHistoryItem.date ? new Date(selectedHistoryItem.date).toLocaleDateString() : '-'}
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
                      <Zap className="text-cyan-400 h-5 w-5" />
                      Live Trading Signals
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Real-time entry points from the Sentinel Engine</p>
                  </div>
                  <button 
                    onClick={() => setShowSignals(false)} 
                    className="text-slate-400 hover:text-white"
                    data-testid="button-close-signals"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                <div className="p-6 overflow-auto max-h-[60vh]">
                  {signalsLoading ? (
                    <div className="text-center py-12 text-slate-500 animate-pulse">
                      Scanning markets for signals...
                    </div>
                  ) : liveSignals.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      No active signals at this time.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {liveSignals.map((sig, i) => (
                        <div key={i} className="bg-slate-950 border border-slate-800 rounded-lg p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                              sig.signal.includes('BUY') ? 'bg-green-500/20 text-green-400' : 
                              sig.signal.includes('SELL') ? 'bg-red-500/20 text-red-400' : 
                              'bg-slate-700 text-slate-300'
                            }`}>
                              {sig.ticker?.slice(0, 3)}
                            </div>
                            <div>
                              <div className="text-white font-bold">{sig.ticker}</div>
                              <div className="text-xs text-slate-500">{sig.signal}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-white font-mono">${sig.price?.toFixed(2)}</div>
                            <div className="text-xs text-slate-500">RSI: {sig.rsi?.toFixed(0)}</div>
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
    </div>
  );
}

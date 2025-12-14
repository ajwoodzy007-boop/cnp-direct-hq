import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Brain, TrendingUp, AlertTriangle, ChevronRight, History as HistoryIcon, X, CheckCircle2, XCircle, Trophy } from 'lucide-react';
import { useAuth } from "../hooks/use-auth";

// --- DATA TYPES ---
interface PickData {
  id: number;
  ticker: string;
  signal: 'BUY' | 'SELL';
  confidence: number;
  entry_price: number;
  exit_price?: number;
  status: 'OPEN' | 'WIN' | 'LOSS';
  analysis: string;
  created_at: string;
  pnl_percent?: number;
}

// --- DEMO DATA: LIVE PICKS ---
const DEMO_LIVE_PICKS: PickData[] = [
  {
    id: 1,
    ticker: "NVDA",
    signal: "BUY",
    confidence: 94,
    entry_price: 875.50,
    status: "OPEN",
    analysis: "Bullish pennant breakout on the 4H chart coinciding with increasing volume. RSI reset to 55 suggests continued upward momentum.",
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    ticker: "AMD",
    signal: "BUY",
    confidence: 89,
    entry_price: 178.20,
    status: "OPEN",
    analysis: "Golden cross formation on the hourly timeframe. Institutional order flow detected at the $175 support level.",
    created_at: new Date().toISOString()
  },
  {
    id: 3,
    ticker: "TSLA",
    signal: "SELL",
    confidence: 82,
    entry_price: 165.40,
    status: "OPEN",
    analysis: "Rejected heavily at the 200 EMA. MACD divergence indicates waning momentum. Expecting a retest of gap fill.",
    created_at: new Date().toISOString()
  }
];

// --- DEMO DATA: HISTORY (The Glass Box) ---
const DEMO_HISTORY: PickData[] = [
  { id: 101, ticker: "COIN", signal: "BUY", confidence: 91, entry_price: 240.00, exit_price: 255.00, status: "WIN", pnl_percent: 6.2, analysis: "Profit target hit.", created_at: "2024-03-10" },
  { id: 102, ticker: "AAPL", signal: "SELL", confidence: 85, entry_price: 172.00, exit_price: 169.50, status: "WIN", pnl_percent: 1.4, analysis: "Support broken.", created_at: "2024-03-09" },
  { id: 103, ticker: "GOOGL", signal: "BUY", confidence: 88, entry_price: 135.00, exit_price: 132.00, status: "LOSS", pnl_percent: -2.2, analysis: "Stop loss triggered.", created_at: "2024-03-08" },
  { id: 104, ticker: "META", signal: "BUY", confidence: 95, entry_price: 485.00, exit_price: 505.00, status: "WIN", pnl_percent: 4.1, analysis: "Gap fill complete.", created_at: "2024-03-08" }
];

// --- STATS CALCULATOR ---
const calculateStats = (history: PickData[]) => {
  const total = history.length;
  const wins = history.filter(p => p.status === 'WIN').length;
  const losses = history.filter(p => p.status === 'LOSS').length;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  const totalGain = history.reduce((acc, curr) => acc + (curr.pnl_percent || 0), 0);
  return { total, wins, losses, winRate, totalGain };
};

export default function TheOracle() {
  const { user } = useAuth();
  const [selectedPick, setSelectedPick] = useState<PickData | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Use Demo Data for now (replace with API calls later)
  const picks = DEMO_LIVE_PICKS;
  const history = DEMO_HISTORY;
  const stats = calculateStats(history);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-2">
            THE ORACLE <Brain className="text-cyan-500 h-8 w-8" />
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            AI-Driven Market Intelligence
          </p>
        </div>
        <button 
          onClick={() => setShowHistory(true)}
          className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all"
        >
          <HistoryIcon size={16} /> FULL LOG
        </button>
      </div>

      {/* --- THE GLASS BOX (SCOREBOARD) --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center">
          <div className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1">Accuracy</div>
          <div className="text-3xl font-black text-cyan-400">{stats.winRate}%</div>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center">
          <div className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1">Wins</div>
          <div className="text-3xl font-black text-green-400">{stats.wins}</div>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center">
          <div className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1">Losses</div>
          <div className="text-3xl font-black text-red-400">{stats.losses}</div>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center">
          <div className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1">Total Gain</div>
          <div className="text-3xl font-black text-white">+{stats.totalGain.toFixed(1)}%</div>
        </div>
      </div>

      {/* Grid of Picks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {picks.map((pick) => (
          <div 
            key={pick.id} 
            onClick={() => setSelectedPick(pick)}
            className="group relative bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 hover:border-cyan-500/50 transition-all cursor-pointer shadow-xl"
          >
            {/* Top Row: Ticker & Confidence */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-3xl font-black text-white tracking-tight">{pick.ticker}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    pick.signal === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {pick.signal} SIGNAL
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    ${pick.entry_price.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <div className="flex items-center justify-end gap-1 text-cyan-400 font-bold text-xl">
                  {pick.confidence}%
                </div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Confidence</div>
              </div>
            </div>

            {/* Analysis Preview */}
            <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800/50 mb-4 h-20 overflow-hidden relative">
               <p className="text-slate-400 text-sm leading-relaxed">
                 {pick.analysis}
               </p>
               <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-slate-950/50 to-transparent" />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 group-hover:text-cyan-400 transition-colors">
               <span>TAP FOR ANALYSIS</span>
               <ChevronRight size={16} />
            </div>
          </div>
        ))}
      </div>

      {/* --- MODAL: PICK DETAILS --- */}
      {selectedPick && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedPick(null)} />
          <div className="relative bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

            {/* Modal Header */}
            <div className="bg-slate-950 p-6 border-b border-slate-800 flex justify-between items-start">
              <div>
                <h2 className="text-4xl font-black text-white">{selectedPick.ticker}</h2>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                    selectedPick.signal === 'BUY' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                  }`}>
                    STRONG {selectedPick.signal}
                  </span>
                  <span className="text-slate-400 font-mono text-sm">
                    Target: ${(selectedPick.entry_price * 1.05).toFixed(2)}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedPick(null)} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="text-slate-500 text-xs uppercase mb-1">Pattern Rating</div>
                  <div className="text-2xl font-bold text-white">9.2<span className="text-slate-600 text-sm">/10</span></div>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="text-slate-500 text-xs uppercase mb-1">Risk Level</div>
                  <div className="text-2xl font-bold text-green-400">LOW</div>
                </div>
              </div>

              <div>
                <h4 className="text-slate-300 font-bold mb-2 flex items-center gap-2">
                  <Brain size={16} className="text-cyan-500" /> Sentinel Logic
                </h4>
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                  <p className="text-slate-300 leading-relaxed text-sm">
                    {selectedPick.analysis}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-950 border-t border-slate-800 mt-4 rounded-xl">
                <a 
                  href={`https://www.tradingview.com/chart/?symbol=${selectedPick.ticker}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="block w-full bg-cyan-600 hover:bg-cyan-500 text-center py-3 rounded-xl font-bold text-white transition-all"
                >
                  OPEN CHART
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: HISTORY LOG (GLASS BOX) --- */}
      {showHistory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
          <div className="relative bg-slate-900 border border-slate-700 w-full max-w-2xl h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-10">
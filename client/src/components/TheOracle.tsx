import React, { useState, useEffect, useMemo } from 'react';
import { ViewfinderCircleIcon, ArrowRightIcon, XMarkIcon, SignalIcon, ChartBarIcon, DocumentTextIcon, ExclamationTriangleIcon, LockClosedIcon, ShieldCheckIcon, FireIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, InformationCircleIcon, BoltIcon, ArrowPathIcon, ClockIcon, CheckCircleIcon, XCircleIcon, CurrencyDollarIcon, CpuChipIcon, ChevronRightIcon, TrophyIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  outcome?: string;
  confidence?: string;
  confidenceScore?: number;
  signal?: string;
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

export default function TheOracle() {
  const [activeTab, setActiveTab] = useState<'stocks' | 'crypto'>('stocks');
  const [picks, setPicks] = useState<PickData[]>([]);
  const [cryptoPicks, setCryptoPicks] = useState<PickData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPick, setSelectedPick] = useState<PickData | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [show30DayModal, setShow30DayModal] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Calculate win rate from all predictions
  const winRateStats = useMemo(() => {
    const allPicks = [...picks, ...cryptoPicks];
    const totalGraded = allPicks.filter(p => p.outcome !== null && p.outcome !== undefined).length;
    const totalWins = allPicks.filter(p => p.outcome === 'WIN').length;
    const winRate = totalGraded > 0 ? Math.round((totalWins / totalGraded) * 100) : 0;
    return { totalGraded, totalWins, winRate };
  }, [picks, cryptoPicks]);

  // Use a try-catch inside the render to prevent the whole page from dying
  const renderContent = () => {
    try {
      const currentPicks = activeTab === 'stocks' ? picks : cryptoPicks;
      const safePicks = Array.isArray(currentPicks) ? currentPicks : [];

      return (
        <div className="space-y-8 p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <ViewfinderCircleIcon className="h-6 w-6 text-cyan-400" />
              The Oracle
            </h2>
            <div className="flex gap-2 mt-4">
              <button 
                onClick={() => setActiveTab('stocks')}
                className={`px-4 py-2 rounded-lg text-sm ${activeTab === 'stocks' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400'}`}
              >
                Stocks
              </button>
              <button 
                onClick={() => setActiveTab('crypto')}
                className={`px-4 py-2 rounded-lg text-sm ${activeTab === 'crypto' ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400'}`}
              >
                Crypto
              </button>
            </div>
          </div>

          {/* Oracle Accuracy Gauge */}
          {winRateStats.totalGraded > 0 && (
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 p-6 rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-cyan-500/20 rounded-xl">
                    <TrophyIcon className="h-8 w-8 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Oracle Accuracy</h3>
                    <p className="text-slate-400 text-sm">Based on {winRateStats.totalGraded} graded predictions</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold text-cyan-400">{winRateStats.winRate}%</div>
                  <div className="text-sm text-slate-400">
                    {winRateStats.totalWins} wins / {winRateStats.totalGraded} total
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Accuracy</span>
                  <span>{winRateStats.winRate}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-cyan-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${winRateStats.winRate}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <p className="text-slate-500">Scanning Markets...</p>
            ) : safePicks.length === 0 ? (
              <p className="text-slate-500">No active signals found.</p>
            ) : (
              safePicks.map((pick, idx) => (
                <div key={`${pick?.ticker || idx}-${idx}`} className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                  <div className="flex justify-between items-start mb-4">
                    <TickerInfo ticker={pick?.ticker || '??'} isCrypto={activeTab === 'crypto'} />
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-bold text-cyan-500">{pick?.confidenceScore || 0}% Conf.</span>
                      {pick?.outcome && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                          pick.outcome === 'WIN'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                          {pick.outcome === 'WIN' ? '✓ Verified' : '✗ Missed'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-slate-400">
                    <div className="flex justify-between">
                      <span>Signal:</span>
                      <span className="text-white font-bold">{pick?.signal || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Target:</span>
                      <span className="text-green-400 font-mono">${pick?.predictedPrice?.toFixed(2) || '0.00'}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedPick(pick)}
                    className="w-full mt-4 py-2 bg-slate-800 hover:bg-cyan-700 rounded-lg text-white text-xs transition-all"
                  >
                    View Analysis
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Minimalist History Section to ensure no crash */}
          <div className="mt-12 border-t border-slate-800 pt-8">
            <h3 className="text-lg font-bold text-white mb-4">Sentinel Audit Log</h3>
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
               <table className="w-full text-left text-sm">
                  <thead className="bg-slate-800 text-slate-500 text-xs">
                    <tr>
                      <th className="p-3">Ticker</th>
                      <th className="p-3 text-right">Return</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(historyData) ? historyData : []).slice(0, 20).map((h, i) => (
                      <tr key={i} className="border-t border-slate-800">
                        <td className="p-3 text-white font-bold">{h?.ticker || 'N/A'}</td>
                        <td className={`p-3 text-right ${h?.profitPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {h?.profitPercent || 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
          </div>
        </div>
      );
    } catch (e) {
      console.error("Render Error:", e);
      return (
        <div className="p-8 text-center bg-slate-900 rounded-xl border border-red-900/50 m-4">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white">Data Sync Issue</h2>
          <p className="text-slate-400 mt-2">The Sentinel found a malformed entry in the historical log.</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2 bg-red-600 text-white rounded-lg"
          >
            Force Sync
          </button>
        </div>
      );
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/oracle/daily');
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setPicks(json.data);
        } else {
          console.warn('Oracle API returned invalid data:', json);
          setPicks([]);
        }

        const hRes = await fetch('/api/oracle/history');
        const hJson = await hRes.json();
        if (hJson.success && Array.isArray(hJson.data)) {
          setHistoryData(hJson.data);
        } else {
          console.warn('Oracle history API returned invalid data:', hJson);
          setHistoryData([]);
        }
      } catch (e) {
        console.error("Fetch error", e);
        setPicks([]);
        setHistoryData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return renderContent();
}
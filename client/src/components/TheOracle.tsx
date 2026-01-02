import React, { useState, useEffect, useMemo } from 'react';
import { ViewfinderCircleIcon, ArrowRightIcon, XMarkIcon, SignalIcon, ChartBarIcon, DocumentTextIcon, ExclamationTriangleIcon, LockClosedIcon, ShieldCheckIcon, FireIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, InformationCircleIcon, BoltIcon, ArrowPathIcon, ClockIcon, CheckCircleIcon, XCircleIcon, CurrencyDollarIcon, CpuChipIcon, ChevronRightIcon, TrophyIcon, CalendarIcon, CpuChipIcon as CpuIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';
import { CpuChipIcon as SolidCpuIcon } from '@heroicons/react/24/solid';
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
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditHistory, setAuditHistory] = useState<any[]>([]);

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
            <div className="flex justify-between items-center mt-4">
              <div className="flex gap-2">
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
              <button
                onClick={async () => {
                  // Load recent audit history (last 10 results)
                  try {
                    const res = await fetch('/api/oracle/vault?limit=10');
                    const json = await res.json();
                    if (json.success && Array.isArray(json.data)) {
                      setAuditHistory(json.data.slice(0, 10));
                      setShowAuditModal(true);
                    }
                  } catch (error) {
                    console.error('Failed to load recent audit:', error);
                  }
                }}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                View Recent Audit
              </button>
            </div>
          </div>

          {/* Sentinel Performance Section */}
          {winRateStats.totalGraded > 0 && (
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700 p-8 rounded-2xl relative overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-0 left-0 w-32 h-32 bg-cyan-500 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 right-0 w-24 h-24 bg-orange-500 rounded-full blur-2xl"></div>
              </div>

              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-gradient-to-br from-cyan-500/20 to-orange-500/20 rounded-2xl border border-cyan-500/30">
                      <SolidCpuIcon className="h-10 w-10 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">Sentinel Performance</h3>
                      <p className="text-slate-400 text-sm">AI Prediction Accuracy Matrix</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-400 mb-1">Win Rate</div>
                    <div className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-orange-400 bg-clip-text text-transparent">
                      {winRateStats.winRate}%
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {winRateStats.totalWins}/{winRateStats.totalGraded} predictions
                    </div>
                  </div>
                </div>

                {/* Circular Gauge */}
                <div className="flex items-center justify-center mb-6">
                  <div className="relative">
                    {/* Background Circle */}
                    <div className="w-40 h-40 rounded-full border-8 border-slate-700"></div>

                    {/* Progress Circle */}
                    <div
                      className="absolute inset-0 rounded-full border-8 border-transparent"
                      style={{
                        background: `conic-gradient(from 0deg, rgb(34 211 238) 0%, rgb(249 115 22) ${winRateStats.winRate}%, transparent ${winRateStats.winRate}%)`,
                        mask: 'radial-gradient(farthest-side, transparent calc(100% - 32px), black calc(100% - 32px))',
                        WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 32px), black calc(100% - 32px))'
                      }}
                    ></div>

                    {/* Center Content */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-white">{winRateStats.winRate}%</div>
                        <div className="text-xs text-slate-400">Accuracy</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance Stats */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-green-400">{winRateStats.totalWins}</div>
                    <div className="text-xs text-slate-400">Wins</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-red-400">{winRateStats.totalGraded - winRateStats.totalWins}</div>
                    <div className="text-xs text-slate-400">Losses</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-cyan-400">{winRateStats.totalGraded}</div>
                    <div className="text-xs text-slate-400">Total</div>
                  </div>
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
              safePicks.map((pick, idx) => {
                // Determine card styling based on outcome
                const cardStyles = pick?.outcome === 'WIN'
                  ? 'bg-slate-900 border-2 border-green-500/50 shadow-lg shadow-green-500/10'
                  : pick?.outcome === 'LOSS'
                    ? 'bg-slate-900 border border-slate-700'
                    : 'bg-slate-900 border border-slate-800';

                const badgeStyles = pick?.outcome === 'WIN'
                  ? 'bg-green-500 text-white border-green-600'
                  : pick?.outcome === 'LOSS'
                    ? 'bg-red-500/20 text-red-400 border-red-500/30'
                    : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 animate-pulse';

                const badgeText = pick?.outcome === 'WIN'
                  ? '🎯 TARGET ACHIEVED'
                  : pick?.outcome === 'LOSS'
                    ? '📉 TARGET MISSED'
                    : '🔄 LIVE EVALUATION';

                const badgeIcon = pick?.outcome === 'WIN'
                  ? '✅'
                  : pick?.outcome === 'LOSS'
                    ? '❌'
                    : '⚡';

                return (
                  <div key={`${pick?.ticker || idx}-${idx}`} className={`${cardStyles} p-6 rounded-xl relative overflow-hidden`}>
                    {/* Outcome-specific background effect */}
                    {pick?.outcome === 'WIN' && (
                      <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent pointer-events-none"></div>
                    )}

                    {/* Status Badge */}
                    <div className="absolute top-4 left-4">
                      <span className={`text-xs px-3 py-1 rounded-full font-bold border ${badgeStyles} flex items-center gap-1`}>
                        {pick?.outcome === null ? (
                          <>
                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                            LIVE EVALUATION
                          </>
                        ) : (
                          <>
                            {badgeIcon} {pick.outcome === 'WIN' ? 'TARGET ACHIEVED' : 'TARGET MISSED'}
                          </>
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between items-start mb-4 pt-12">
                      <TickerInfo ticker={pick?.ticker || '??'} isCrypto={activeTab === 'crypto'} />
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs font-bold text-cyan-500">{pick?.confidenceScore || 0}% Conf.</span>
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
                    <div className="flex justify-between">
                      <span>Generated:</span>
                      <span className="text-cyan-400 font-mono text-xs">{pick?.displayDate || 'N/A'}</span>
                    </div>
                  </div>
                    <button
                      onClick={async () => {
                        if (pick?.outcome === 'LOSS' && pick?.id) {
                          // For LOSS outcomes, fetch from history endpoint
                          try {
                            const res = await fetch(`/api/oracle/history/${pick.id}`);
                            const json = await res.json();
                            if (json.success) {
                              setSelectedPick(json.data);
                            } else {
                              console.error('Failed to fetch historical data:', json.error);
                              setSelectedPick(pick); // Fallback to current data
                            }
                          } catch (error) {
                            console.error('Error fetching historical prediction:', error);
                            setSelectedPick(pick); // Fallback to current data
                          }
                        } else {
                          setSelectedPick(pick);
                        }
                      }}
                      className={`w-full mt-4 py-2 rounded-lg text-white text-xs transition-all ${
                        pick?.outcome === 'WIN'
                          ? 'bg-green-600 hover:bg-green-500'
                          : pick?.outcome === 'LOSS'
                            ? 'bg-red-600 hover:bg-red-500'
                            : 'bg-slate-800 hover:bg-cyan-700'
                      }`}
                    >
                      {pick?.outcome === 'WIN' ? '🎯 Analysis Complete' :
                       pick?.outcome === 'LOSS' ? '📊 Review Analysis' :
                       '🔍 View Analysis'}
                    </button>
                  </div>
                );
              })
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

  return (
    <>
      {renderContent()}

      {/* Audit Log Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-6xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <DocumentTextIcon className="h-6 w-6 text-orange-400" />
                  Recent Audit - Last 10 Predictions
                </h3>
                <button
                  onClick={() => setShowAuditModal(false)}
                  className="text-slate-400 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>
              <p className="text-slate-400 mt-2">Quick reference of recent AI predictions and outcomes</p>
            </div>

            <div className="overflow-y-auto max-h-[60vh]">
              <div className="p-6">
                {auditHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <DocumentTextIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-400">No historical predictions found.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {auditHistory.map((prediction, idx) => (
                      <div key={`audit-${prediction.id}-${idx}`} className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <TickerInfo ticker={prediction.ticker} isCrypto={false} />
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              prediction.outcome === 'WIN'
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : prediction.outcome === 'LOSS'
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                            }`}>
                              {prediction.outcome === 'WIN' ? '✅ TARGET ACHIEVED' :
                               prediction.outcome === 'LOSS' ? '❌ TARGET MISSED' :
                               '⏳ PENDING'}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-slate-400">{prediction.displayDate}</div>
                            <div className="text-xs text-slate-500">ID: {prediction.id}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-slate-400">Target Price</div>
                            <div className="text-white font-mono">${prediction.predictedPrice?.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-slate-400">Confidence</div>
                            <div className="text-cyan-400 font-semibold">{prediction.confidenceScore}%</div>
                          </div>
                          <div>
                            <div className="text-slate-400">Signal</div>
                            <div className="text-white">{prediction.signal?.substring(0, 40)}...</div>
                          </div>
                        </div>

                        {prediction.learning_metadata && (
                          <div className="mt-3 pt-3 border-t border-slate-700">
                            <div className="text-xs text-slate-400 mb-1">AI Learning Notes</div>
                            <div className="text-xs text-orange-400">
                              {prediction.learning_metadata.strategy_note?.substring(0, 100)}...
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
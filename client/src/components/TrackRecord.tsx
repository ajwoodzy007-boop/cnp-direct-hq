import React, { useState, useEffect } from 'react';
import { TrophyIcon, ArrowTrendingUpIcon, ViewfinderCircleIcon, CalendarIcon, ChevronRightIcon, XMarkIcon, ArrowPathIcon, ChartBarIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { useModalBack } from '@/hooks/useNavigationStack';
import TickerInfo from './TickerInfo';

interface BacktestPick {
  ticker: string;
  signal: string;
  openPrice: number;
  closePrice: number;
  returnPercent: number;
  win: boolean;
}

interface DayResult {
  date: string;
  picks: BacktestPick[];
  winCount: number;
  lossCount: number;
  avgReturn: number;
}

interface BacktestSummary {
  totalDays: number;
  totalPicks: number;
  wins: number;
  losses: number;
  winRate: number;
  avgReturn: number;
  cumulativeReturn: number;
  winningDays: number;
  losingDays: number;
  dayWinRate: number;
  days: DayResult[];
}

interface SummaryData {
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

export default function TrackRecord() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [show30DayModal, setShow30DayModal] = useState(false);
  const [show6MonthModal, setShow6MonthModal] = useState(false);
  const [thirtyDayData, setThirtyDayData] = useState<BacktestSummary | null>(null);
  const [sixMonthData, setSixMonthData] = useState<BacktestSummary | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useModalBack(show30DayModal, () => setShow30DayModal(false), 'track-30day-modal');
  useModalBack(show6MonthModal, () => setShow6MonthModal(false), 'track-6month-modal');

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const res = await fetch('/api/backtest/summary');
      const data = await res.json();
      if (data.success && data.data) {
        setSummary(data.data);
      } else {
        // Set default structure if API doesn't return expected format
        setSummary({
          thirtyDay: {
            winRate: 0,
            wins: 0,
            losses: 0,
            avgReturn: 0,
            totalPicks: 0
          },
          sixMonth: null
        });
      }
    } catch (error) {
      console.error('Failed to fetch backtest summary:', error);
      // Set default structure on error to prevent crash
      setSummary({
        thirtyDay: {
          winRate: 0,
          wins: 0,
          losses: 0,
          avgReturn: 0,
          totalPicks: 0
        },
        sixMonth: null
      });
    } finally {
      setLoading(false);
    }
  };

  const fetch30DayData = async () => {
    // Always fetch fresh data (no caching)
    setLoadingDetail(true);
    setShow30DayModal(true);
    try {
      const res = await fetch('/api/backtest/30-day');
      const data = await res.json();
      if (data.success) {
        setThirtyDayData(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch 30-day data:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const fetch6MonthData = async () => {
    if (sixMonthData) {
      setShow6MonthModal(true);
      return;
    }
    setLoadingDetail(true);
    setShow6MonthModal(true);
    try {
      const res = await fetch('/api/backtest/6-month');
      const data = await res.json();
      if (data.success) {
        setSixMonthData(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch 6-month data:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 p-6 rounded-2xl border border-slate-800 animate-pulse">
        <div className="h-24 bg-slate-800 rounded-lg"></div>
      </div>
    );
  }

  if (!summary) return null;

  const chartData = thirtyDayData?.days?.slice().reverse().map(day => ({
    date: formatDate(day.date),
    return: day.avgReturn,
    wins: day.winCount,
    losses: day.lossCount
  })) || [];

  const sixMonthChartData = sixMonthData?.days?.slice().reverse().map((day, idx) => {
    let cumulative = 0;
    for (let i = 0; i <= idx; i++) {
      const d = sixMonthData.days[sixMonthData.days.length - 1 - i];
      cumulative += d.picks.reduce((sum, p) => sum + p.returnPercent, 0);
    }
    return {
      date: formatDate(day.date),
      cumulative: parseFloat(cumulative.toFixed(2)),
      return: day.avgReturn
    };
  }) || [];

  return (
    <>
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 p-6 rounded-2xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <TrophyIcon className="text-emerald-400 h-6 w-6" />
              <h3 className="text-xl font-bold text-white">Algorithm Track Record</h3>
            </div>
            <span className="text-xs text-slate-500 uppercase tracking-wider">Verified Backtest</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-950/50 backdrop-blur-md p-4 rounded-xl border border-slate-700/50">
              <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">30-Day Signal Confidence</div>
              <div className="text-3xl font-bold text-emerald-400">{summary?.thirtyDay?.winRate ?? 0}%</div>
              <div className="text-xs text-slate-500 mt-1">{summary?.thirtyDay?.wins ?? 0}W / {summary?.thirtyDay?.losses ?? 0}L</div>
            </div>
            
            <div className="bg-slate-950/50 backdrop-blur-md p-4 rounded-xl border border-slate-700/50">
              <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Avg Return</div>
              <div className="text-3xl font-bold text-green-400">+{summary?.thirtyDay?.avgReturn ?? 0}%</div>
              <div className="text-xs text-slate-500 mt-1">Per Pick</div>
            </div>

            {summary?.sixMonth && (
              <>
                <div className="bg-slate-950/50 backdrop-blur-md p-4 rounded-xl border border-slate-700/50">
                  <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">6-Month Signal Confidence</div>
                  <div className="text-3xl font-bold text-emerald-400">{summary.sixMonth.winRate}%</div>
                  <div className="text-xs text-slate-500 mt-1">{summary.sixMonth.totalPicks} Picks</div>
                </div>
                
                <div className="bg-slate-950/50 backdrop-blur-md p-4 rounded-xl border border-slate-700/50">
                  <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Cumulative Return</div>
                  <div className="text-3xl font-bold text-green-400">+{summary.sixMonth.cumulativeReturn}%</div>
                  <div className="text-xs text-slate-500 mt-1">6 Months</div>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={fetch30DayData}
              className="flex-1 py-3 bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
              data-testid="button-view-30day"
            >
              <CalendarIcon className="h-4 w-4" />
              View 30-Day Details
              <ChevronRightIcon className="h-4 w-4" />
            </button>
            
            <button
              onClick={fetch6MonthData}
              className="flex-1 py-3 bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
              data-testid="button-view-6month"
            >
              <ChartBarIcon className="h-4 w-4" />
              View 6-Month History
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
          
          <p className="text-xs text-slate-600 mt-4 text-center italic">
            Past performance does not guarantee future results. Backtest based on historical data.
          </p>
        </div>
      </div>

      <Dialog open={show30DayModal} onOpenChange={setShow30DayModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <CalendarIcon className="text-emerald-400 h-5 w-5" />
              30-Day Rolling Performance
            </DialogTitle>
          </DialogHeader>
          
          {loadingDetail ? (
            <div className="flex items-center justify-center py-12">
              <ArrowPathIcon className="h-8 w-8 text-emerald-500 animate-spin" />
              <span className="ml-3 text-slate-400">Loading backtest data...</span>
            </div>
          ) : thirtyDayData ? (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-slate-800 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-emerald-400">{thirtyDayData.winRate}%</div>
                  <div className="text-xs text-slate-500">Signal Confidence</div>
                </div>
                <div className="bg-slate-800 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-400">+{thirtyDayData.avgReturn}%</div>
                  <div className="text-xs text-slate-500">Avg Return</div>
                </div>
                <div className="bg-slate-800 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-white">{thirtyDayData.totalPicks}</div>
                  <div className="text-xs text-slate-500">Total Picks</div>
                </div>
                <div className="bg-slate-800 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-cyan-400">{thirtyDayData.dayWinRate}%</div>
                  <div className="text-xs text-slate-500">Day Accuracy</div>
                </div>
              </div>

              {chartData.length > 0 && (
                <div className="bg-slate-800 p-4 rounded-lg">
                  <h4 className="text-sm font-bold text-slate-400 mb-4">Daily Returns</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `${v}%`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                        labelStyle={{ color: '#94a3b8' }}
                      />
                      <Bar dataKey="return" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={index} fill={entry.return >= 0 ? '#10b981' : '#ef4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="bg-slate-800 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-700/50">
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Picks</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-slate-400 uppercase">W/L</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-400 uppercase">Avg Return</th>
                    </tr>
                  </thead>
                  <tbody>
                    {thirtyDayData.days.map((day, idx) => (
                      <tr key={day.date} className={idx % 2 === 0 ? 'bg-slate-800' : 'bg-slate-800/50'}>
                        <td className="px-4 py-3 text-sm text-white font-medium">{formatDate(day.date)}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {day.picks.map((pick, i) => (
                              <span 
                                key={i}
                                className={`text-xs px-2 py-0.5 rounded ${pick.win ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}
                              >
                                {pick.ticker} {pick.returnPercent >= 0 ? '+' : ''}{pick.returnPercent.toFixed(1)}%
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-green-400">{day.winCount}W</span>
                          <span className="text-slate-500 mx-1">/</span>
                          <span className="text-red-400">{day.lossCount}L</span>
                        </td>
                        <td className={`px-4 py-3 text-right font-mono font-bold ${day.avgReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {day.avgReturn >= 0 ? '+' : ''}{day.avgReturn}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">Failed to load data</div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={show6MonthModal} onOpenChange={setShow6MonthModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <TrophyIcon className="text-emerald-400 h-5 w-5" />
              6-Month Historical Performance
            </DialogTitle>
          </DialogHeader>
          
          {loadingDetail ? (
            <div className="flex items-center justify-center py-12">
              <ArrowPathIcon className="h-8 w-8 text-emerald-500 animate-spin" />
              <span className="ml-3 text-slate-400">Loading 6-month backtest... This may take a moment.</span>
            </div>
          ) : sixMonthData ? (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-slate-800 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-emerald-400">{sixMonthData.winRate}%</div>
                  <div className="text-xs text-slate-500">Signal Confidence</div>
                </div>
                <div className="bg-slate-800 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-400">+{sixMonthData.avgReturn}%</div>
                  <div className="text-xs text-slate-500">Avg Return</div>
                </div>
                <div className="bg-slate-800 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-white">{sixMonthData.totalPicks}</div>
                  <div className="text-xs text-slate-500">Total Picks</div>
                </div>
                <div className="bg-slate-800 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-yellow-400">+{sixMonthData.cumulativeReturn}%</div>
                  <div className="text-xs text-slate-500">Cumulative</div>
                </div>
              </div>

              {sixMonthChartData.length > 0 && (
                <div className="bg-slate-800 p-4 rounded-lg">
                  <h4 className="text-sm font-bold text-slate-400 mb-4">Cumulative Return Over Time</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={sixMonthChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `${v}%`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                        labelStyle={{ color: '#94a3b8' }}
                        formatter={(value: number) => [`${value.toFixed(2)}%`, 'Cumulative Return']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="cumulative" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="bg-slate-800 p-4 rounded-lg">
                <h4 className="text-sm font-bold text-slate-400 mb-4">Performance Summary</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-slate-500 text-xs uppercase mb-2">Winning Days</div>
                    <div className="flex items-center gap-2">
                      <div className="text-2xl font-bold text-green-400">{sixMonthData.winningDays}</div>
                      <span className="text-slate-500">/ {sixMonthData.totalDays} days</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs uppercase mb-2">Day Accuracy</div>
                    <div className="text-2xl font-bold text-emerald-400">{sixMonthData.dayWinRate}%</div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Top Picks</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-slate-400 uppercase">W/L</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-400 uppercase">Avg Return</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sixMonthData.days.map((day, idx) => (
                      <tr key={day.date} className={idx % 2 === 0 ? 'bg-slate-800' : 'bg-slate-800/50'}>
                        <td className="px-4 py-2 text-sm text-white font-medium">{formatDate(day.date)}</td>
                        <td className="px-4 py-2">
                          <div className="flex flex-wrap gap-1">
                            {day.picks.slice(0, 3).map((pick, i) => (
                              <span 
                                key={i}
                                className={`text-xs px-2 py-0.5 rounded ${pick.win ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}
                              >
                                {pick.ticker}
                              </span>
                            ))}
                            {day.picks.length > 3 && (
                              <span className="text-xs text-slate-500">+{day.picks.length - 3}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-center text-sm">
                          <span className="text-green-400">{day.winCount}</span>
                          <span className="text-slate-500">/</span>
                          <span className="text-red-400">{day.lossCount}</span>
                        </td>
                        <td className={`px-4 py-2 text-right font-mono text-sm ${day.avgReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {day.avgReturn >= 0 ? '+' : ''}{day.avgReturn}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <p className="text-xs text-slate-600 text-center italic">
                Backtest sampled every 3rd trading day for efficiency. Full daily data available upon request.
              </p>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">Failed to load data</div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

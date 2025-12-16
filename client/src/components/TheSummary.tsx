import React from 'react';
import { useQuery } from '@tanstack/react-query';
import TickerInfo from './TickerInfo';
import { 
  ArrowTrendingUpIcon, ArrowTrendingDownIcon, ViewfinderCircleIcon, CpuChipIcon, 
  ArrowUpRightIcon, ArrowDownRightIcon, ClockIcon, BoltIcon, TrophyIcon,
  ChevronRightIcon, ArrowPathIcon, ExclamationTriangleIcon, ShieldCheckIcon, FireIcon
} from '@heroicons/react/24/outline';

interface MarketMover {
  ticker: string;
  price: number;
  changePercent: number;
  signal?: string;
}

interface Prediction {
  ticker: string;
  signal: string;
  confidence: string;
  entryPrice?: number;
  predictedPrice?: number;
}

interface PredictionStats {
  winRate: number;
  wins: number;
  losses: number;
}

interface Props {
  onNavigate: (tab: string) => void;
  user: { email: string; tier: string } | null;
}

export default function TheSummary({ onNavigate, user }: Props) {
  const { data: sentinelData, isLoading: sentinelLoading } = useQuery<{ data?: MarketMover[] }>({
    queryKey: ['/api/market/sentinel'],
    refetchInterval: 60000,
  });

  const { data: predictionsData, isLoading: predictionsLoading } = useQuery<{ success?: boolean; data?: Prediction[] }>({
    queryKey: ['/api/oracle/daily'],
    refetchInterval: 60000,
  });

  const { data: statsData } = useQuery<{ success?: boolean; data?: PredictionStats }>({
    queryKey: ['/api/top10/stats'],
    refetchInterval: 120000,
  });

  const marketMovers: MarketMover[] = sentinelData?.data?.slice(0, 4) || [];
  const topPredictions: Prediction[] = predictionsData?.data?.slice(0, 3) || [];
  const signalAccuracy = statsData?.data?.winRate ?? null;
  const systemHeat = -14.2;

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good Morning' : currentHour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-white" data-testid="text-greeting">
            {greeting}, Operative
          </h1>
          <p className="text-slate-500 text-xs md:text-sm">Market intelligence briefing</p>
        </div>
        <div className="flex items-center gap-2 text-slate-600 text-xs">
          <ClockIcon className="h-3 w-3" />
          <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900/80 border border-green-500/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheckIcon className="h-4 w-4 text-green-400" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Signal Accuracy</span>
          </div>
          <div className="font-mono text-2xl font-bold text-green-400">
            {signalAccuracy !== null ? `${signalAccuracy}%` : '—'}
          </div>
          <div className="text-[10px] text-slate-600">Beta Model • Live</div>
        </div>
        <div className="bg-slate-900/80 border border-red-500/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <FireIcon className="h-4 w-4" style={{ color: '#FF3B30' }} />
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">System Heat</span>
          </div>
          <div className="font-mono text-2xl font-bold" style={{ color: '#FF3B30' }}>{systemHeat}%</div>
          <div className="text-[10px] text-slate-600">Max Drawdown</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div 
          className="bg-gradient-to-br from-cyan-900/30 to-slate-900 border border-cyan-500/20 rounded-lg p-3 cursor-pointer hover:border-cyan-500/40 transition-all group"
          onClick={() => onNavigate('radar')}
          data-testid="card-market-movers"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded bg-cyan-500/20 flex items-center justify-center">
                <BoltIcon className="h-4 w-4 text-cyan-400" />
              </div>
              <h3 className="font-semibold text-white text-sm">Market Movers</h3>
            </div>
            <ChevronRightIcon className="h-4 w-4 text-slate-600 group-hover:text-cyan-400 transition-colors" />
          </div>
          
          {sentinelLoading ? (
            <div className="flex items-center justify-center py-4">
              <ArrowPathIcon className="h-5 w-5 text-cyan-400 animate-spin" />
            </div>
          ) : marketMovers.length > 0 ? (
            <div className="space-y-1">
              {marketMovers.map((stock, i) => (
                <div key={stock.ticker} className="flex items-center justify-between py-1 border-b border-slate-800/50 last:border-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-600 w-3">{i + 1}</span>
                    <TickerInfo ticker={stock.ticker} size="sm" />
                    {stock.signal === 'MOMENTUM BUY' && (
                      <span className="text-[9px] px-1 py-0.5 bg-green-500/20 text-green-400 rounded">BUY</span>
                    )}
                  </div>
                  <div className={`flex items-center gap-0.5 text-xs font-medium ${stock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {stock.changePercent >= 0 ? <ArrowUpRightIcon className="h-2.5 w-2.5" /> : <ArrowDownRightIcon className="h-2.5 w-2.5" />}
                    {Math.abs(stock.changePercent).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-3 text-slate-500 text-xs">
              Loading...
            </div>
          )}
        </div>

        <div 
          className="bg-gradient-to-br from-amber-900/20 to-slate-900 border border-amber-500/20 rounded-lg p-3 cursor-pointer hover:border-amber-500/40 transition-all group"
          onClick={() => onNavigate('oracle')}
          data-testid="card-predictions"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded bg-amber-500/20 flex items-center justify-center">
                <ViewfinderCircleIcon className="h-4 w-4 text-amber-400" />
              </div>
              <h3 className="font-semibold text-white text-sm">Today's Picks</h3>
            </div>
            <ChevronRightIcon className="h-4 w-4 text-slate-600 group-hover:text-amber-400 transition-colors" />
          </div>
          
          {predictionsLoading ? (
            <div className="flex items-center justify-center py-4">
              <ArrowPathIcon className="h-5 w-5 text-amber-400 animate-spin" />
            </div>
          ) : topPredictions.length > 0 ? (
            <div className="space-y-1.5">
              {topPredictions.map((pred, i) => (
                <div key={pred.ticker} className="flex items-center justify-between py-0.5">
                  <div className="flex items-center gap-1.5">
                    <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      i === 0 ? 'bg-amber-500 text-black' : 'bg-slate-700 text-slate-300'
                    }`}>
                      {i + 1}
                    </div>
                    <TickerInfo ticker={pred.ticker} size="sm" />
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    pred.signal?.includes('BUY') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {pred.signal?.includes('MOMENTUM') ? 'MOM' : pred.signal?.includes('VALUE') ? 'VAL' : pred.signal?.slice(0, 4)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-500/50 mx-auto mb-1" />
              <p className="text-slate-500 text-[10px]">Predictions at 7:30 AM ET</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div 
          className="bg-slate-900 border border-slate-800 rounded-lg p-3 cursor-pointer hover:border-pink-500/40 transition-all group"
          onClick={() => onNavigate('strategist')}
          data-testid="card-strategist"
        >
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center">
              <CpuChipIcon className="h-4 w-4 text-pink-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white text-sm">STRATEGIST</h3>
              <p className="text-[10px] text-slate-500 truncate">AI Playbooks</p>
            </div>
            <ChevronRightIcon className="h-4 w-4 text-slate-600 group-hover:text-pink-400 transition-colors shrink-0" />
          </div>
        </div>

        <div 
          className="bg-slate-900 border border-slate-800 rounded-lg p-3 cursor-pointer hover:border-blue-500/40 transition-all group"
          onClick={() => onNavigate('academy')}
          data-testid="card-academy"
        >
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
              <TrophyIcon className="h-4 w-4 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white text-sm">ACADEMY</h3>
              <p className="text-[10px] text-slate-500 truncate">Education</p>
            </div>
            <ChevronRightIcon className="h-4 w-4 text-slate-600 group-hover:text-blue-400 transition-colors shrink-0" />
          </div>
        </div>
      </div>
    </div>
  );
}

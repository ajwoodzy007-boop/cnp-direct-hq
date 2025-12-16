import React from 'react';
import { useQuery } from '@tanstack/react-query';
import TickerInfo from './TickerInfo';
import { 
  ArrowTrendingUpIcon, ArrowTrendingDownIcon, ViewfinderCircleIcon, BriefcaseIcon, CpuChipIcon, 
  ArrowUpRightIcon, ArrowDownRightIcon, ClockIcon, BoltIcon, TrophyIcon,
  ChevronRightIcon, ArrowPathIcon, ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import logoImage from '@/assets/cnp-eagle-logo.jpg';

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

interface PortfolioSummary {
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  topHolding?: { ticker: string; value: number };
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

  const { data: portfolioData } = useQuery<{ summary?: PortfolioSummary }>({
    queryKey: ['/api/portfolio/summary'],
    retry: false,
    enabled: !!user,
  });

  const marketMovers: MarketMover[] = sentinelData?.data?.slice(0, 5) || [];
  const topPredictions: Prediction[] = predictionsData?.data?.slice(0, 3) || [];
  const portfolio: PortfolioSummary | null = user ? (portfolioData?.summary || null) : null;

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good Morning' : currentHour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="space-y-6 relative">
      <div 
        className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.12]"
        style={{ zIndex: 0 }}
      >
        <img 
          src={logoImage} 
          alt="" 
          className="w-[500px] h-[500px] object-contain"
        />
      </div>
      <div className="flex items-center justify-between relative" style={{ zIndex: 1 }}>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white" data-testid="text-greeting">
            {greeting}, Operative
          </h1>
          <p className="text-slate-400 mt-1">Here's your market intelligence briefing</p>
        </div>
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <ClockIcon className="h-4 w-4" />
          <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative" style={{ zIndex: 1 }}>
        <div 
          className="bg-gradient-to-br from-cyan-900/30 to-slate-900 border border-cyan-500/20 rounded-xl p-5 cursor-pointer hover:border-cyan-500/40 transition-all group"
          onClick={() => onNavigate('radar')}
          data-testid="card-market-movers"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <BoltIcon className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Market Movers</h3>
                <p className="text-xs text-slate-500">Top signals today</p>
              </div>
            </div>
            <ChevronRightIcon className="h-5 w-5 text-slate-600 group-hover:text-cyan-400 transition-colors" />
          </div>
          
          {sentinelLoading ? (
            <div className="flex items-center justify-center py-6">
              <ArrowPathIcon className="h-6 w-6 text-cyan-400 animate-spin" />
            </div>
          ) : marketMovers.length > 0 ? (
            <div className="space-y-2">
              {marketMovers.map((stock, i) => (
                <div key={stock.ticker} className="flex items-center justify-between py-1.5 border-b border-slate-800/50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 w-4">{i + 1}</span>
                    <TickerInfo ticker={stock.ticker} size="sm" />
                    {stock.signal === 'MOMENTUM BUY' && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">BUY</span>
                    )}
                  </div>
                  <div className={`flex items-center gap-1 text-sm font-medium ${stock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {stock.changePercent >= 0 ? <ArrowUpRightIcon className="h-3 w-3" /> : <ArrowDownRightIcon className="h-3 w-3" />}
                    {Math.abs(stock.changePercent).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500 text-sm">
              Market data loading...
            </div>
          )}
        </div>

        <div 
          className="bg-gradient-to-br from-amber-900/20 to-slate-900 border border-amber-500/20 rounded-xl p-5 cursor-pointer hover:border-amber-500/40 transition-all group"
          onClick={() => onNavigate('oracle')}
          data-testid="card-predictions"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <ViewfinderCircleIcon className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Today's Picks</h3>
                <p className="text-xs text-slate-500">AI predictions</p>
              </div>
            </div>
            <ChevronRightIcon className="h-5 w-5 text-slate-600 group-hover:text-amber-400 transition-colors" />
          </div>
          
          {predictionsLoading ? (
            <div className="flex items-center justify-center py-6">
              <ArrowPathIcon className="h-6 w-6 text-amber-400 animate-spin" />
            </div>
          ) : topPredictions.length > 0 ? (
            <div className="space-y-3">
              {topPredictions.map((pred, i) => (
                <div key={pred.ticker} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0 ? 'bg-amber-500 text-black' : 'bg-slate-700 text-slate-300'
                    }`}>
                      {i + 1}
                    </div>
                    <TickerInfo ticker={pred.ticker} size="sm" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      pred.signal?.includes('BUY') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {pred.signal?.includes('MOMENTUM') ? 'MOMENTUM' : pred.signal?.includes('VALUE') ? 'VALUE' : pred.signal}
                    </span>
                    <span className={`text-xs ${pred.confidence === 'High' ? 'text-green-400' : 'text-amber-400'}`}>
                      {pred.confidence}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <ExclamationTriangleIcon className="h-8 w-8 text-amber-500/50 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Predictions post at 7:30 AM ET</p>
            </div>
          )}
          
          {topPredictions.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-800">
              <p className="text-xs text-slate-500 text-center">View all 10 picks in The Oracle</p>
            </div>
          )}
        </div>

        <div 
          className="bg-gradient-to-br from-purple-900/20 to-slate-900 border border-purple-500/20 rounded-xl p-5 cursor-pointer hover:border-purple-500/40 transition-all group"
          onClick={() => onNavigate('vault')}
          data-testid="card-portfolio"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <BriefcaseIcon className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Your Portfolio</h3>
                <p className="text-xs text-slate-500">Holdings overview</p>
              </div>
            </div>
            <ChevronRightIcon className="h-5 w-5 text-slate-600 group-hover:text-purple-400 transition-colors" />
          </div>
          
          {portfolio ? (
            <div className="space-y-3">
              <div>
                <p className="text-2xl font-bold text-white">${portfolio.totalValue.toLocaleString()}</p>
                <div className={`flex items-center gap-1 text-sm ${portfolio.dayChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {portfolio.dayChange >= 0 ? <ArrowTrendingUpIcon className="h-4 w-4" /> : <ArrowTrendingDownIcon className="h-4 w-4" />}
                  <span>${Math.abs(portfolio.dayChange).toLocaleString()} ({portfolio.dayChangePercent.toFixed(2)}%)</span>
                </div>
              </div>
              {portfolio.topHolding && (
                <div className="pt-2 border-t border-slate-800">
                  <p className="text-xs text-slate-500">Top Holding</p>
                  <p className="text-white font-medium">{portfolio.topHolding.ticker} - ${portfolio.topHolding.value.toLocaleString()}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <BriefcaseIcon className="h-8 w-8 text-purple-500/50 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Add holdings to track</p>
              <p className="text-xs text-slate-600 mt-1">Set up your portfolio in The Vault</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 relative" style={{ zIndex: 1 }}>
        <div 
          className="bg-slate-900 border border-slate-800 rounded-xl p-5 cursor-pointer hover:border-slate-700 transition-all group"
          onClick={() => onNavigate('strategist')}
          data-testid="card-strategist"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center">
                <CpuChipIcon className="h-5 w-5 text-pink-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">AI Strategist</h3>
                <p className="text-xs text-slate-500">Personalized trading playbooks</p>
              </div>
            </div>
            <ChevronRightIcon className="h-5 w-5 text-slate-600 group-hover:text-pink-400 transition-colors" />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {['Options Signals', 'Risk Assessment', 'Pattern Recognition', 'Earnings Plays'].map(feature => (
              <div key={feature} className="text-xs text-slate-400 flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-pink-500/50" />
                {feature}
              </div>
            ))}
          </div>
        </div>

        <div 
          className="bg-slate-900 border border-slate-800 rounded-xl p-5 cursor-pointer hover:border-slate-700 transition-all group"
          onClick={() => onNavigate('academy')}
          data-testid="card-academy"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                <TrophyIcon className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">The Academy</h3>
                <p className="text-xs text-slate-500">Daily market briefings & education</p>
              </div>
            </div>
            <ChevronRightIcon className="h-5 w-5 text-slate-600 group-hover:text-blue-400 transition-colors" />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {['Market Briefing', 'Sector Analysis', 'Trading Lessons', 'Strategy Guides'].map(feature => (
              <div key={feature} className="text-xs text-slate-400 flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500/50" />
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

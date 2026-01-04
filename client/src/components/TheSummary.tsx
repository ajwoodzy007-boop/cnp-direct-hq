import React, { useState, useMemo } from 'react';
import {
  ArrowPathIcon,
  ArrowUpRightIcon,
  ArrowDownRightIcon,
  BoltIcon,
  CalendarIcon,
  ChevronRightIcon,
  ClockIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
  FireIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
  ViewfinderCircleIcon,
  XMarkIcon,
  BriefcaseIcon,
} from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';
import { HeatGauge } from './HeatGauge';
import { Sparkline } from './Sparkline';
import TickerInfo from './TickerInfo';

// HeatGauge Component
function HeatGaugeComponent({ value, size = 60 }: { value: number; size?: number }) {
  const normalizedValue = Math.max(-100, Math.min(100, value));
  const percentage = (normalizedValue + 100) / 200;
  const angle = percentage * 180 - 90;

  const radius = size / 2 - 8;
  const centerX = size / 2;
  const centerY = size / 2 + 5;

  const needleX = centerX + Math.cos((angle * Math.PI) / 180) * radius;
  const needleY = centerY + Math.sin((angle * Math.PI) / 180) * radius;

  const getColor = (val: number) => {
    if (val <= -50) return '#10b981';
    if (val <= 0) return '#3b82f6';
    if (val <= 50) return '#f59e0b';
    return '#ef4444';
  };

  const color = getColor(normalizedValue);

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="overflow-visible">
        <path
          d={`M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}`}
          fill="none"
          stroke="#374151"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d={`M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}`}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${percentage * 2 * Math.PI * radius} ${2 * Math.PI * radius}`}
        />
        <line
          x1={centerX}
          y1={centerY}
          x2={needleX}
          y2={needleY}
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx={centerX} cy={centerY} r="3" fill="#ffffff" />
      </svg>
    </div>
  );
}

// Sparkline Component
function SparklineComponent({ data, width, height, color }: { data: number[]; width: number; height: number; color: string }) {
  if (!data || data.length === 0) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Generate mock sparkline data
const generateSparklineData = (startPrice: number, changePercent: number) => {
  const points = 12;
  const data = [startPrice];
  const targetPrice = startPrice * (1 + changePercent / 100);

  for (let i = 1; i < points; i++) {
    const progress = i / (points - 1);
    const currentPrice = startPrice + (targetPrice - startPrice) * progress;
    // Add some noise
    const noise = (Math.random() - 0.5) * (startPrice * 0.02);
    data.push(currentPrice + noise);
  }

  return data;
};

interface TheSummaryProps {
  onNavigate: (section: string) => void;
}

export default function TheSummary({ onNavigate }: TheSummaryProps) {
  const [showAccuracyModal, setShowAccuracyModal] = useState(false);
  const [showHeatModal, setShowHeatModal] = useState(false);

  const currentHour = new Date().getHours();

  // Mock data for demonstration
  const predictionsLoading = false;
  const sentinelLoading = false;
  const topPredictions = [
    { ticker: 'AAPL', signal: 'MOMENTUM BUY' },
    { ticker: 'MSFT', signal: 'VALUE BUY' },
    { ticker: 'TSLA', signal: 'MOMENTUM BUY' },
  ];

  const marketMovers = [
    { ticker: 'AAPL', price: 180.50, changePercent: 2.3, signal: 'MOMENTUM BUY' },
    { ticker: 'TSLA', price: 245.20, changePercent: -1.8, signal: 'VALUE BUY' },
    { ticker: 'NVDA', price: 875.30, changePercent: 5.7, signal: 'MOMENTUM BUY' },
  ];

  const portfolioData = { portfolio: [] };
  const predictionsData = { data: topPredictions };
  const sentinelData = { data: marketMovers };

  // Calculate Dynamic Volatility Score
  const systemHeat = useMemo(() => {
    if (!marketMovers || marketMovers.length === 0) return -14.2;

    const positiveChanges = marketMovers.filter(m => m.changePercent > 0).length;
    const negativeChanges = marketMovers.filter(m => m.changePercent < 0).length;
    const totalChanges = positiveChanges + negativeChanges;

    if (totalChanges === 0) return 0;

    const fluctuationRatio = positiveChanges / negativeChanges;
    const avgAbsChange = marketMovers.reduce((sum, m) => sum + Math.abs(m.changePercent), 0) / marketMovers.length;
    const baseHeat = (fluctuationRatio - 1) * 25;
    const volatilityBonus = avgAbsChange * 2;

    const heatScore = baseHeat + volatilityBonus;
    return Math.max(-100, Math.min(100, heatScore));
  }, [marketMovers]);

  // Signal Accuracy Query
  const { data: statsData } = useQuery({
    queryKey: ['top10', 'stats'],
    queryFn: async () => ({ winRate: 73, wins: 22, losses: 8, sessionActive: false }),
  });

  const signalAccuracy = statsData?.winRate || 0;
  const sessionActive = statsData?.sessionActive || false;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-white" data-testid="text-greeting">
            Good Morning, Operative
          </h1>
          <p className="text-slate-500 text-xs md:text-sm">Market intelligence briefing</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-600">
          <ClockIcon className="h-3 w-3" />
          <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Top Row: Today's Picks (Left) & System Heat (Right) */}
      <div className="grid grid-cols-2 gap-3">
        {/* Top-Left: Today's Picks */}
        <div
          className="bg-gradient-to-br from-amber-900/20 to-slate-900 border border-amber-500/20 rounded-lg p-3 cursor-pointer hover:border-amber-500/40 transition-all group"
          onClick={() => onNavigate('oracle')}
          data-testid="card-todays-picks"
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
              {!portfolioData?.portfolio || portfolioData.portfolio.length === 0 ? (
                <>
                  <BriefcaseIcon className="h-5 w-5 text-amber-500/50 mx-auto mb-1" />
                  <p className="text-slate-500 text-[10px] mb-1">Add Tickers to your Portfolio</p>
                  <p className="text-slate-500 text-[9px]">to start tracking personalized signals</p>
                </>
              ) : (
                <>
                  <ExclamationTriangleIcon className="h-5 w-5 text-amber-500/50 mx-auto mb-1" />
                  <p className="text-slate-500 text-[10px]">Predictions at 7:30 AM ET</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Top-Right: Market Heat & Confidence */}
        <div
          className="bg-slate-900/80 border border-red-500/30 rounded-lg p-3 cursor-pointer hover:border-red-500/60 hover:bg-slate-900 transition-all group"
          onClick={() => setShowHeatModal(true)}
          data-testid="card-system-heat"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <FireIcon className="h-4 w-4" style={{ color: '#FF3B30' }} />
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Market Heat</span>
            </div>
            <InformationCircleIcon className="h-3.5 w-3.5 text-slate-600 group-hover:text-red-400 transition-colors" />
          </div>
          <div className="flex justify-center">
            <HeatGaugeComponent value={systemHeat} size={50} />
          </div>
          <div className="text-[10px] text-slate-600 text-center mt-1">Volatility Score</div>
        </div>
      </div>

      {/* Center Body: Market Movers */}
      <div
        className="bg-gradient-to-br from-cyan-900/30 to-slate-900 border border-cyan-500/20 rounded-lg p-3 cursor-pointer hover:border-cyan-500/40 transition-all group"
        onClick={() => onNavigate('radar')}
        data-testid="card-market-movers"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <BoltIcon className="h-4 w-4 text-cyan-400" />
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
            {marketMovers.map((stock, i) => {
              const sparklineData = generateSparklineData(stock.price * (1 - stock.changePercent / 100), stock.changePercent);
              return (
                <div key={stock.ticker} className="flex items-center justify-between py-1 border-b border-slate-800/50 last:border-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-600 w-3">{i + 1}</span>
                    <TickerInfo ticker={stock.ticker} size="sm" />
                    {stock.signal === 'MOMENTUM BUY' && (
                      <span className="text-[9px] px-1 py-0.5 bg-green-500/20 text-green-400 rounded">BUY</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <SparklineComponent
                      data={sparklineData}
                      width={32}
                      height={12}
                      color={stock.changePercent >= 0 ? '#10b981' : '#ef4444'}
                    />
                    <div className={`flex items-center gap-0.5 text-xs font-medium ${stock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {stock.changePercent >= 0 ? <ArrowUpRightIcon className="h-2.5 w-2.5" /> : <ArrowDownRightIcon className="h-2.5 w-2.5" />}
                      {Math.abs(stock.changePercent).toFixed(1)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-cyan-500/50 mx-auto mb-1" />
            <p className="text-slate-500 text-[10px]">Market data loading...</p>
          </div>
        )}
      </div>

      {/* Bottom Tray: Economic Calendar & Signal Accuracy */}
      <div className="grid grid-cols-2 gap-3">
        {/* Economic Calendar */}
        <div className="bg-slate-900/80 border border-blue-500/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <CalendarIcon className="h-4 w-4 text-blue-400" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Economic Calendar</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300">FOMC Meeting</span>
              <span className="text-blue-400">Tomorrow 2:00 PM</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300">CPI Data</span>
              <span className="text-blue-400">Fri 8:30 AM</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300">Fed Speech</span>
              <span className="text-blue-400">Mon 10:00 AM</span>
            </div>
          </div>
        </div>

        {/* Signal Accuracy */}
        <div
          className="bg-slate-900/80 border border-green-500/30 rounded-lg p-3 cursor-pointer hover:border-green-500/60 hover:bg-slate-900 transition-all group"
          onClick={() => setShowAccuracyModal(true)}
          data-testid="card-signal-accuracy"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="h-4 w-4 text-green-400" />
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Signal Accuracy</span>
            </div>
            <InformationCircleIcon className="h-3.5 w-3.5 text-slate-600 group-hover:text-green-400 transition-colors" />
          </div>
          <div className="font-mono text-2xl font-bold text-green-400">
            {signalAccuracy !== null ? `${signalAccuracy}%` : '—'}
          </div>
          <div className="text-[10px] text-slate-600">
            {sessionActive ? 'Beta: Session in Progress' : 'Beta Model • Live'}
          </div>
        </div>
      </div>

      {/* Accuracy Modal */}
      {showAccuracyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-green-500/40 w-full max-w-sm rounded-xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="h-5 w-5 text-green-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Intel: Signal Accuracy</h3>
              </div>
              <button
                onClick={() => setShowAccuracyModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
                data-testid="button-close-accuracy-modal"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400 mb-1">{signalAccuracy}%</div>
                <div className="text-xs text-slate-400">Win Rate (Last 30 Days)</div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div>
                  <div className="text-lg font-bold text-green-400">{statsData?.wins || 0}</div>
                  <div className="text-xs text-slate-400">Wins</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-red-400">{statsData?.losses || 0}</div>
                  <div className="text-xs text-slate-400">Losses</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Heat Modal */}
      {showHeatModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-red-500/40 w-full max-w-sm rounded-xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
              <div className="flex items-center gap-2">
                <FireIcon className="h-5 w-5" style={{ color: '#FF3B30' }} />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Intel: System Heat</h3>
              </div>
              <button
                onClick={() => setShowHeatModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
                data-testid="button-close-heat-modal"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">
                  <HeatGaugeComponent value={systemHeat} size={80} />
                </div>
                <div className="text-xs text-slate-400 mb-3">Current Volatility Score: {systemHeat.toFixed(1)}</div>
              </div>
              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className={systemHeat > 50 ? 'text-red-400' : systemHeat > 0 ? 'text-orange-400' : systemHeat > -50 ? 'text-blue-400' : 'text-green-400'}>
                    {systemHeat > 50 ? 'Critical Heat' : systemHeat > 0 ? 'Warm' : systemHeat > -50 ? 'Cold' : 'Ice Cold'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Calculation:</span>
                  <span>Fluctuation Theorem</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
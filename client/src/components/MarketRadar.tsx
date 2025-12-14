import React, { useState, useEffect } from 'react';
import { ShieldExclamationIcon, ArrowPathIcon, ChevronDownIcon, ChevronUpIcon, SignalIcon, ChartBarIcon, CurrencyDollarIcon, ArrowTrendingUpIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import StockChart from './StockChart';
import Skeleton from './Skeleton';
import FullReportModal from './FullReportModal';

interface SentinelData {
  ticker: string;
  name?: string;
  price: number;
  changePercent: number;
  rsi: number;
  rvol: number;
  sentimentScore?: number;
  marketCap?: number;
  volume24h?: number;
  verdict: string;
  signal: string;
}

type TabType = 'stocks' | 'crypto';

export default function MarketRadar() {
  const [activeTab, setActiveTab] = useState<TabType>('stocks');
  const [stockData, setStockData] = useState<SentinelData[]>([]);
  const [cryptoData, setCryptoData] = useState<SentinelData[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<string | null>(null);
  
  const [briefing, setBriefing] = useState<any>(null);
  const [briefingLoading, setBriefingLoading] = useState(true);
  const [fullReport, setFullReport] = useState<any>(null);
  const [loadingFull, setLoadingFull] = useState(false);
  const [showFullModal, setShowFullModal] = useState(false);
  const [showBriefingModal, setShowBriefingModal] = useState(false);

  const fetchStockScan = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/market/sentinel');
      const json = await res.json();
      if (json.success) {
        setStockData(json.data);
        setLastScan(new Date().toLocaleTimeString());
      }
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  };

  const fetchCryptoScan = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/market/crypto');
      const json = await res.json();
      if (json.success) {
        setCryptoData(json.data);
        setLastScan(new Date().toLocaleTimeString());
      }
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  };

  const fetchScan = () => {
    if (activeTab === 'stocks') {
      fetchStockScan();
    } else {
      fetchCryptoScan();
    }
  };

  useEffect(() => { 
    fetchStockScan();
    fetchBriefing();
  }, []);

  const fetchBriefing = async () => {
    try {
      const res = await fetch('/api/academy/briefing');
      const json = await res.json();
      if (json.success) setBriefing(json.data);
    } catch (e) { console.error(e); } finally { setBriefingLoading(false); }
  };

  const handleOpenFullReport = async () => {
    setLoadingFull(true);
    try {
      const res = await fetch('/api/academy/full-report');
      if (res.status === 403) {
        alert("This report is classified. Upgrade to Premium to access the full intelligence briefing.");
        setLoadingFull(false);
        return;
      }
      const json = await res.json();
      if (json.success) {
        setFullReport(json.data);
        setShowFullModal(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFull(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'crypto' && cryptoData.length === 0) {
      fetchCryptoScan();
    }
  }, [activeTab]);

  const data = activeTab === 'stocks' ? stockData : cryptoData;

  const toggleRow = (ticker: string) => {
    setExpandedTicker(expandedTicker === ticker ? null : ticker);
  };

  const getSignalBadge = (signal: string) => {
    const baseClasses = "px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap min-w-fit shrink-0";
    
    if (signal.includes('BUY')) 
      return <span className={`${baseClasses} bg-green-500/20 text-green-500 border-green-500/50`}>🚀 {signal}</span>;
    if (signal.includes('WARNING')) 
      return <span className={`${baseClasses} bg-red-500/20 text-red-500 border-red-500/50`}>⚠️ {signal}</span>;
    return <span className={`${baseClasses} bg-gray-500/20 text-gray-400 border-gray-500/50`}>WAIT</span>;
  };

  const formatPrice = (price: number) => {
    if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    return `$${price.toFixed(4)}`;
  };

  const formatMarketCap = (cap: number) => {
    if (cap >= 1e12) return `$${(cap / 1e12).toFixed(1)}T`;
    if (cap >= 1e9) return `$${(cap / 1e9).toFixed(1)}B`;
    if (cap >= 1e6) return `$${(cap / 1e6).toFixed(1)}M`;
    return `$${cap.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-4 bg-slate-900 p-6 rounded-xl border border-slate-800 h-full">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                <ShieldExclamationIcon className="text-cyan-400 h-5 w-5" /> Market Sentinel Radar
              </h2>
              <p className="text-slate-400 text-xs mt-1">
                {activeTab === 'stocks' ? 'Stock Surveillance Active' : 'Crypto Surveillance Active (24/7)'}
              </p>
            </div>
            <button 
              onClick={fetchScan} 
              disabled={loading} 
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 text-xs rounded-lg flex items-center gap-1 transition-all border border-slate-700 hover:border-cyan-500/30"
              data-testid="button-initiate-scan"
            >
              <ArrowPathIcon className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Scanning...' : 'Refresh'}
            </button>
          </div>

          <div className="flex gap-2 mt-auto">
            <button
              onClick={() => setActiveTab('stocks')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-all ${
                activeTab === 'stocks'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white hover:border-slate-600'
              }`}
              data-testid="tab-stocks"
            >
              <ArrowTrendingUpIcon className="h-3.5 w-3.5" />
              Stocks
            </button>
            <button
              onClick={() => setActiveTab('crypto')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-all ${
                activeTab === 'crypto'
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white hover:border-slate-600'
              }`}
              data-testid="tab-crypto"
            >
              <CurrencyDollarIcon className="h-3.5 w-3.5" />
              Crypto
            </button>
          </div>
        </div>

        <div 
          onClick={() => !briefingLoading && briefing && setShowBriefingModal(true)}
          className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden cursor-pointer hover:border-amber-500/50 transition-all h-full flex flex-col"
          data-testid="card-daily-briefing"
        >
          <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <SignalIcon className={`h-4 w-4 ${briefingLoading ? 'text-slate-500' : 'text-red-500 animate-pulse'}`} />
              <h3 className="font-bold text-white text-sm">Sentinel Daily Briefing</h3>
            </div>
            <span className="text-xs text-amber-500 font-mono border border-amber-500/30 px-2 py-0.5 rounded bg-amber-500/10" data-testid="text-briefing-date">
              {briefing?.date || 'CONNECTING...'}
            </span>
          </div>
          <div className="p-4 flex-1 flex flex-col justify-center">
            {briefingLoading ? (
              <div className="flex items-center justify-center text-slate-500 gap-2">
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading Intel...</span>
              </div>
            ) : briefing ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-xs font-bold rounded-full border ${
                    briefing.sentiment === 'BULLISH' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                    briefing.sentiment === 'BEARISH' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                    'bg-slate-500/10 text-slate-400 border-slate-500/20'
                  }`} data-testid="text-sentiment">
                    {briefing.sentiment}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white line-clamp-2" data-testid="text-headline">{briefing.headline}</h4>
                <p className="text-xs text-slate-400 line-clamp-2">{briefing.summary}</p>
                <div className="text-xs text-cyan-400 flex items-center gap-1 mt-2">
                  <DocumentTextIcon className="h-3 w-3" />
                  Click to read full briefing
                </div>
              </div>
            ) : (
              <div className="text-center text-red-400 text-sm">Briefing Unavailable</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {data.length === 0 && loading && (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-slate-900/50 rounded-lg border border-slate-800 p-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <div className="flex gap-4">
                  <Skeleton className="h-8 w-20 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {data.length === 0 && !loading && (
          <div className="text-center py-12 text-slate-500">
            Radar Offline. Click "Refresh" to begin.
          </div>
        )}

        {data.map((item) => (
          <div key={item.ticker} className="bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden transition-all" data-testid={`radar-card-${item.ticker}`}>
            
            <div 
              onClick={() => toggleRow(item.ticker)}
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-white border ${
                  activeTab === 'crypto' 
                    ? 'bg-orange-500/20 border-orange-500/50' 
                    : 'bg-slate-800 border-slate-700'
                }`}>
                  {activeTab === 'crypto' ? (
                    <CurrencyDollarIcon className="h-5 w-5 text-orange-400" />
                  ) : (
                    item.ticker.substring(0, 2)
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-white flex items-center gap-2">
                    {item.ticker}
                    {item.name && <span className="text-xs text-slate-500 font-normal hidden md:inline">{item.name}</span>}
                  </h3>
                  <div className={`text-sm ${item.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatPrice(item.price)} ({item.changePercent > 0 ? '+' : ''}{item.changePercent.toFixed(2)}%)
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 md:gap-6 shrink-0">
                <div className="hidden md:flex gap-6">
                  <div className="text-center">
                    <div className="text-xs text-slate-500 uppercase flex items-center gap-1"><SignalIcon className="h-3 w-3" /> RSI</div>
                    <div className={`font-mono font-bold ${item.rsi > 70 ? 'text-red-400' : item.rsi < 30 ? 'text-green-400' : 'text-slate-300'}`}>{item.rsi}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-500 uppercase flex items-center gap-1"><ChartBarIcon className="h-3 w-3" /> RVOL</div>
                    <div className={`font-mono font-bold ${item.rvol > 2 ? 'text-cyan-400' : 'text-slate-300'}`}>{item.rvol}x</div>
                  </div>
                  {activeTab === 'crypto' && item.marketCap && (
                    <div className="text-center">
                      <div className="text-xs text-slate-500 uppercase">MCap</div>
                      <div className="font-mono font-bold text-slate-300">{formatMarketCap(item.marketCap)}</div>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  {getSignalBadge(item.signal)}
                </div>
                {expandedTicker === item.ticker ? <ChevronUpIcon className="text-cyan-500 h-5 w-5"/> : <ChevronDownIcon className="text-slate-600 h-5 w-5"/>}
              </div>
            </div>

            {expandedTicker === item.ticker && (
              <div className="bg-slate-950/50 border-t border-slate-800 p-6 animate-in slide-in-from-top-2 duration-200">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">30-Day Trend Analysis</h4>
                  <div className="text-xs text-slate-500">Source: Sentinel Data Feed</div>
                </div>
                
                <StockChart ticker={activeTab === 'crypto' ? `${item.ticker}-USD` : item.ticker} />
                
                <div className={`mt-4 grid gap-4 text-center ${activeTab === 'crypto' ? 'grid-cols-4' : 'grid-cols-3'}`}>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <div className="text-xs text-slate-500">Volume Strength</div>
                    <div className="text-white font-mono">{item.rvol}x Avg</div>
                  </div>
                  {activeTab === 'stocks' && (
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <div className="text-xs text-slate-500">Sentiment Score</div>
                      <div className="text-white font-mono">{item.sentimentScore ?? 'N/A'}</div>
                    </div>
                  )}
                  {activeTab === 'crypto' && (
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <div className="text-xs text-slate-500">Market Cap</div>
                      <div className="text-white font-mono">{item.marketCap ? formatMarketCap(item.marketCap) : 'N/A'}</div>
                    </div>
                  )}
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <div className="text-xs text-slate-500">AI Verdict</div>
                    <div className={`font-bold ${activeTab === 'crypto' ? 'text-orange-400' : 'text-cyan-400'}`}>{item.verdict}</div>
                  </div>
                  {activeTab === 'crypto' && (
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <div className="text-xs text-slate-500">24h Change</div>
                      <div className={`font-mono font-bold ${item.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {item.changePercent > 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {lastScan && (
        <div className="text-center text-xs text-slate-600 mt-4">
          Last Radar Sweep: {lastScan} {activeTab === 'crypto' && '• Markets: 24/7'}
        </div>
      )}

      {showBriefingModal && briefing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950 shrink-0">
              <div className="flex items-center gap-3">
                <SignalIcon className="h-5 w-5 text-red-500 animate-pulse" />
                <h3 className="text-xl font-bold text-white">Sentinel Daily Briefing</h3>
                <span className="text-xs text-amber-500 font-mono border border-amber-500/30 px-2 py-1 rounded bg-amber-500/10">
                  {briefing.date}
                </span>
              </div>
              <button 
                onClick={() => setShowBriefingModal(false)} 
                className="text-slate-400 hover:text-white p-1"
                data-testid="button-close-briefing"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 text-xs font-bold rounded-full border ${
                  briefing.sentiment === 'BULLISH' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                  briefing.sentiment === 'BEARISH' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                  'bg-slate-500/10 text-slate-400 border-slate-500/20'
                }`}>
                  {briefing.sentiment} SENTIMENT
                </span>
              </div>
              <h4 className="text-2xl font-bold text-white">{briefing.headline}</h4>
              <p className="text-slate-300 leading-relaxed">{briefing.summary}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <strong className="text-cyan-400 block mb-2 text-xs uppercase">Key Levels</strong>
                  <span className="text-slate-300">{briefing.keyLevels}</span>
                </div>
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <strong className="text-amber-400 block mb-2 text-xs uppercase">Action Plan</strong>
                  <span className="text-slate-300">{briefing.actionPlan}</span>
                </div>
              </div>
              
              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button 
                  onClick={handleOpenFullReport}
                  disabled={loadingFull}
                  className="flex items-center gap-2 text-sm font-bold text-cyan-400 hover:text-cyan-300 transition-colors bg-cyan-950/30 hover:bg-cyan-950/50 px-4 py-2 rounded-lg border border-cyan-500/30 disabled:opacity-50"
                  data-testid="button-full-report"
                >
                  {loadingFull ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <DocumentTextIcon className="h-4 w-4" />}
                  {loadingFull ? 'Decrypting...' : 'Read Full Intelligence Report'}
                </button>
              </div>
            </div>
            <div className="p-4 border-t border-slate-800 bg-slate-950 shrink-0">
              <button
                onClick={() => setShowBriefingModal(false)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
              >
                Close Briefing
              </button>
            </div>
          </div>
        </div>
      )}

      {showFullModal && fullReport && (
        <FullReportModal data={fullReport} onClose={() => setShowFullModal(false)} />
      )}
    </div>
  );
}

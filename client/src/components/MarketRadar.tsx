import React, { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw, ChevronDown, ChevronUp, Activity, BarChart2 } from 'lucide-react';
import StockChart from './StockChart';

interface SentinelData {
  ticker: string;
  price: number;
  changePercent: number;
  rsi: number;
  rvol: number;
  sentimentScore: number;
  verdict: string;
  signal: string;
}

export default function MarketRadar() {
  const [data, setData] = useState<SentinelData[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<string | null>(null);

  const fetchScan = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/market/sentinel');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setLastScan(new Date().toLocaleTimeString());
      }
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchScan(); }, []);

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-slate-900 p-6 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
            <ShieldAlert className="text-cyan-400 h-6 w-6" /> Market Sentinel Radar
          </h2>
          <p className="text-slate-400 text-sm mt-1">Surveillance Active • Click rows for Charts</p>
        </div>
        <button 
          onClick={fetchScan} 
          disabled={loading} 
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg flex items-center gap-2 transition-all"
          data-testid="button-initiate-scan"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Scanning...' : 'Scan Sector'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {data.length === 0 && !loading && (
          <div className="text-center py-12 text-slate-500">
            Radar Offline. Click "Scan Sector" to begin.
          </div>
        )}

        {data.map((stock) => (
          <div key={stock.ticker} className="bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden transition-all" data-testid={`radar-card-${stock.ticker}`}>
            
            <div 
              onClick={() => toggleRow(stock.ticker)}
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-white border border-slate-700">
                  {stock.ticker.substring(0, 2)}
                </div>
                <div>
                  <h3 className="font-bold text-white">{stock.ticker}</h3>
                  <div className={`text-sm ${stock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${stock.price.toFixed(2)} ({stock.changePercent > 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%)
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 md:gap-6 shrink-0">
                <div className="hidden md:flex gap-6">
                  <div className="text-center">
                    <div className="text-xs text-slate-500 uppercase flex items-center gap-1"><Activity className="h-3 w-3" /> RSI</div>
                    <div className={`font-mono font-bold ${stock.rsi > 70 ? 'text-red-400' : stock.rsi < 30 ? 'text-green-400' : 'text-slate-300'}`}>{stock.rsi}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-500 uppercase flex items-center gap-1"><BarChart2 className="h-3 w-3" /> RVOL</div>
                    <div className={`font-mono font-bold ${stock.rvol > 2 ? 'text-cyan-400' : 'text-slate-300'}`}>{stock.rvol}x</div>
                  </div>
                </div>
                <div className="text-right">
                  {getSignalBadge(stock.signal)}
                </div>
                {expandedTicker === stock.ticker ? <ChevronUp className="text-cyan-500 h-5 w-5"/> : <ChevronDown className="text-slate-600 h-5 w-5"/>}
              </div>
            </div>

            {expandedTicker === stock.ticker && (
              <div className="bg-slate-950/50 border-t border-slate-800 p-6 animate-in slide-in-from-top-2 duration-200">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">30-Day Trend Analysis</h4>
                  <div className="text-xs text-slate-500">Source: Sentinel Data Feed</div>
                </div>
                
                <StockChart ticker={stock.ticker} />
                
                <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <div className="text-xs text-slate-500">Volume Strength</div>
                    <div className="text-white font-mono">{stock.rvol}x Avg</div>
                  </div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <div className="text-xs text-slate-500">Sentiment Score</div>
                    <div className="text-white font-mono">{stock.sentimentScore}</div>
                  </div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <div className="text-xs text-slate-500">AI Verdict</div>
                    <div className="text-cyan-400 font-bold">{stock.verdict}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {lastScan && (
        <div className="text-center text-xs text-slate-600 mt-4">
          Last Radar Sweep: {lastScan}
        </div>
      )}
    </div>
  );
}

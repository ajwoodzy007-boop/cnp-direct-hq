import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  RefreshCw, 
  TrendingUp, 
  Activity, 
  BarChart2 
} from 'lucide-react';

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
      console.error("Radar offline:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScan();
  }, []);

  const getSignalBadge = (signal: string) => {
    if (signal.includes('BUY')) 
      return <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-500 border border-green-500/50">🚀 {signal}</span>;
    if (signal.includes('WARNING') || signal.includes('SELL')) 
      return <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-500 border border-red-500/50">⚠️ {signal}</span>;
    return <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-500/20 text-gray-400 border border-gray-500/50">WAIT</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-xl border border-slate-700">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
            <ShieldAlert className="text-cyan-400 h-6 w-6" />
            Market Sentinel Radar
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Real-time algorithmic surveillance • {data.length} Assets Tracked
          </p>
        </div>
        
        <button 
          onClick={fetchScan} 
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-all disabled:opacity-50"
          data-testid="button-initiate-scan"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Scanning...' : 'Initiate Scan'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {data.length === 0 && !loading && (
          <div className="text-center py-12 text-slate-500">
            Radar Offline. Click "Initiate Scan" to begin.
          </div>
        )}

        {data.map((stock) => (
          <div 
            key={stock.ticker} 
            className="group relative bg-slate-900/50 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/30 rounded-lg p-4 transition-all"
            data-testid={`radar-card-${stock.ticker}`}
          >
            <div className="flex items-center justify-between">
              
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-white border border-slate-700">
                  {stock.ticker.substring(0, 2)}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">{stock.ticker}</h3>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-300">${stock.price.toFixed(2)}</span>
                    <span className={`${stock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {stock.changePercent > 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="hidden md:flex gap-8">
                <div className="text-center">
                  <div className="text-xs text-slate-500 mb-1 flex items-center gap-1 justify-center">
                    <Activity className="h-3 w-3" /> RSI
                  </div>
                  <div className={`font-mono font-bold ${stock.rsi > 70 ? 'text-red-400' : stock.rsi < 30 ? 'text-green-400' : 'text-slate-300'}`}>
                    {stock.rsi}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-slate-500 mb-1 flex items-center gap-1 justify-center">
                    <BarChart2 className="h-3 w-3" /> RVOL
                  </div>
                  <div className={`font-mono font-bold ${stock.rvol > 2 ? 'text-cyan-400' : 'text-slate-300'}`}>
                    {stock.rvol}x
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-slate-500 mb-1">Sentiment</div>
                  <div className={`font-bold ${stock.sentimentScore > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {stock.verdict}
                  </div>
                </div>
              </div>

              <div className="text-right">
                {getSignalBadge(stock.signal)}
              </div>
            </div>
            
            <div className="mt-4 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
               <div 
                 className={`h-full ${stock.rsi > 70 ? 'bg-red-500' : 'bg-cyan-500'}`} 
                 style={{ width: `${stock.rsi}%` }}
               />
            </div>
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

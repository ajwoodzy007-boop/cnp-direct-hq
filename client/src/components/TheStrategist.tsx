import React, { useState } from 'react';
import { 
  BrainCircuit, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Layers,
  Zap 
} from 'lucide-react';

export default function TheStrategist() {
  const [ticker, setTicker] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker) return;
    
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/strategist/analyze?ticker=${ticker}`);
      const json = await res.json();
      if (json.success) setResult(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-slate-800 pb-6">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <BrainCircuit className="text-purple-400 h-8 w-8" />
            The Strategist
          </h2>
          <p className="text-slate-400 mt-2">
            AI-Derived Options Playbooks & Execution Algorithms.
          </p>
        </div>

        <form onSubmit={handleAnalyze} className="relative w-full md:w-96">
          <input 
            type="text" 
            placeholder="Enter Ticker (e.g. NVDA)..." 
            className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 pl-12 pr-4 text-white focus:outline-none focus:border-purple-500 transition-colors uppercase"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            data-testid="input-ticker"
          />
          <Search className="absolute left-4 top-3.5 text-slate-500 h-5 w-5" />
          <button 
            type="submit"
            className="absolute right-2 top-2 bg-purple-600 hover:bg-purple-500 text-white p-1.5 rounded-md transition-colors"
            data-testid="button-analyze"
          >
            <Zap className="h-4 w-4" />
          </button>
        </form>
      </div>

      {loading && (
        <div className="text-center py-20 text-slate-500 animate-pulse">
          Calculating Volatility & Greeks...
        </div>
      )}

      {result && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-6 h-fit">
            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-4">Target Asset</h3>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-4xl font-bold text-white">{result.ticker}</span>
              <span className="text-xl text-slate-400 font-mono">${result.currentPrice.toFixed(2)}</span>
            </div>
            
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold border ${
              result.trend === 'BULLISH' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
              result.trend === 'BEARISH' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
              'bg-slate-500/10 text-slate-400 border-slate-500/20'
            }`}>
              {result.trend === 'BULLISH' && <TrendingUp className="h-4 w-4" />}
              {result.trend === 'BEARISH' && <TrendingDown className="h-4 w-4" />}
              {result.trend === 'NEUTRAL' && <Minus className="h-4 w-4" />}
              {result.trend} TREND
            </div>

            <div className="mt-8 space-y-4">
              <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-xs text-slate-500 mb-1">Implied Risk Profile</div>
                <div className="text-white font-medium">{result.strategy.riskProfile}</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-purple-900/20 border border-purple-500/30 rounded-xl p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Layers className="h-32 w-32 text-purple-500" />
            </div>

            <h3 className="text-purple-400 text-sm font-bold uppercase tracking-wider mb-2">Recommended Playbook</h3>
            <h2 className="text-3xl font-bold text-white mb-4">{result.strategy.name}</h2>
            <p className="text-slate-300 max-w-lg mb-8 leading-relaxed">
              {result.strategy.description}
            </p>

            <div className="space-y-3 mb-8">
              {result.strategy.legs.map((leg: any, idx: number) => (
                <div key={idx} className="flex items-center gap-4 bg-slate-950/50 p-4 rounded-lg border border-purple-500/20">
                  <div className={`h-8 w-8 rounded flex items-center justify-center font-bold text-xs ${
                    leg.type.includes('Buy') ? 'bg-green-500 text-green-950' : 'bg-red-500 text-red-950'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-bold">{leg.type} ${leg.strike} Strike</div>
                    <div className="text-xs text-slate-500">Expiry: {leg.expiry}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950/30 p-3 rounded border border-white/5">
                <div className="text-xs text-slate-500 uppercase">Est. Delta</div>
                <div className="font-mono text-white">{result.strategy.greeks.delta}</div>
              </div>
              <div className="bg-slate-950/30 p-3 rounded border border-white/5">
                <div className="text-xs text-slate-500 uppercase">Est. Theta</div>
                <div className="font-mono text-white">{result.strategy.greeks.theta}</div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

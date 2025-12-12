import React, { useState } from 'react';
import { BrainCircuit, Search, Zap, Shield, TrendingUp, AlertTriangle, Crosshair, DollarSign, Flame, Bitcoin } from 'lucide-react';

export default function TheStrategist() {
  const [mode, setMode] = useState<'PLAYBOOK' | 'CRYPTO' | 'EARNINGS'>('PLAYBOOK');
  
  const [ticker, setTicker] = useState('');
  const [capital, setCapital] = useState('2000');
  const [risk, setRisk] = useState('Moderate');
  const [playbook, setPlaybook] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Crypto state
  const [cryptoSymbol, setCryptoSymbol] = useState('');
  const [cryptoTimeframe, setCryptoTimeframe] = useState('swing');
  const [cryptoPlaybook, setCryptoPlaybook] = useState<any>(null);
  const [cryptoLoading, setCryptoLoading] = useState(false);

  const [earningsList, setEarningsList] = useState<any[]>([]);
  const [earningsPlay, setEarningsPlay] = useState<any>(null);
  const [scanning, setScanning] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setPlaybook(null);
    try {
      const res = await fetch('/api/strategist/playbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, capital, riskProfile: risk })
      });
      const json = await res.json();
      if (json.success) setPlaybook(json.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const [cryptoError, setCryptoError] = useState<string | null>(null);

  const handleCryptoGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCryptoLoading(true);
    setCryptoPlaybook(null);
    setCryptoError(null);
    
    // Normalize symbol: uppercase, remove any -USD suffix (backend will add it)
    const normalizedSymbol = cryptoSymbol.toUpperCase().replace(/[-_]?USD$/i, '').trim();
    
    // Client-side validation to prevent empty symbol submission
    if (!normalizedSymbol) {
      setCryptoError('Please enter a valid crypto symbol (e.g., BTC, ETH, SOL)');
      setCryptoLoading(false);
      return;
    }
    
    try {
      const res = await fetch('/api/strategist/crypto-playbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: normalizedSymbol, capital, timeframe: cryptoTimeframe, riskProfile: risk })
      });
      const json = await res.json();
      if (json.success) {
        setCryptoPlaybook(json.data);
      } else {
        setCryptoError(json.error || 'Failed to generate crypto playbook');
      }
    } catch (err) { 
      console.error(err);
      setCryptoError('Network error - please try again');
    } finally { setCryptoLoading(false); }
  };

  const scanEarnings = async () => {
    setScanning(true);
    try {
      const res = await fetch('/api/strategist/earnings-scanner');
      const json = await res.json();
      if (json.success) setEarningsList(json.data);
    } catch (e) { console.error(e); } finally { setScanning(false); }
  };

  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  const generateEarningsPlay = async (item: any) => {
    setGenerating(true);
    setEarningsPlay(null);
    setSelectedTicker(item.ticker);
    try {
      const res = await fetch('/api/strategist/earnings-play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: item.ticker, price: item.price, date: item.date })
      });
      const json = await res.json();
      if (json.success) setEarningsPlay(json.data);
    } catch (e) { console.error(e); } finally { setGenerating(false); }
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      
      <div className="border-b border-slate-800 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <BrainCircuit className="text-purple-500 h-8 w-8" />
            The Strategist <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded border border-purple-500/50">PREMIUM AI</span>
          </h2>
          <p className="text-slate-400 mt-2">Institutional-grade derivatives analysis and strategy generation.</p>
        </div>
        
        <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button 
            onClick={() => setMode('PLAYBOOK')}
            className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${mode === 'PLAYBOOK' ? 'bg-purple-600 text-white shadow' : 'text-slate-500 hover:text-white'}`}
            data-testid="tab-playbook"
          >
            <Crosshair className="h-4 w-4" /> Stock Playbook
          </button>
          <button 
            onClick={() => setMode('CRYPTO')}
            className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${mode === 'CRYPTO' ? 'bg-orange-600 text-white shadow' : 'text-slate-500 hover:text-white'}`}
            data-testid="tab-crypto"
          >
            <Bitcoin className="h-4 w-4" /> Crypto Playbook
          </button>
          <button 
            onClick={() => setMode('EARNINGS')}
            className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${mode === 'EARNINGS' ? 'bg-amber-600 text-white shadow' : 'text-slate-500 hover:text-white'}`}
            data-testid="tab-earnings"
          >
            <Flame className="h-4 w-4" /> Earnings Hunter
          </button>
        </div>
      </div>

      {mode === 'PLAYBOOK' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Crosshair className="h-4 w-4 text-purple-400" /> Mission Parameters
              </h3>
              <form onSubmit={handleGenerate} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-500 font-bold uppercase">Target Asset</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <input 
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-9 text-white uppercase font-bold focus:border-purple-500 outline-none" 
                      placeholder="e.g. TSLA" 
                      value={ticker} 
                      onChange={e => setTicker(e.target.value)} 
                      required 
                      data-testid="input-strategist-ticker"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-bold uppercase">Allocated Capital</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <input 
                      type="number" 
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-9 text-white font-mono focus:border-purple-500 outline-none" 
                      value={capital} 
                      onChange={e => setCapital(e.target.value)} 
                      data-testid="input-strategist-capital"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-bold uppercase">Risk Profile</label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {['Conservative', 'Moderate', 'Aggressive'].map(r => (
                      <button 
                        key={r} 
                        type="button" 
                        onClick={() => setRisk(r)} 
                        className={`text-xs py-2 rounded border transition-all ${risk === r ? 'bg-purple-600 border-purple-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'}`}
                        data-testid={`button-risk-${r.toLowerCase()}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <button 
                  disabled={loading} 
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all mt-4 disabled:opacity-50"
                  data-testid="button-generate-playbook"
                >
                  {loading ? <span className="animate-pulse">Analyzing Market...</span> : <><Zap className="h-4 w-4" /> Generate Playbook</>}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-8">
            {!playbook ? (
              <div className="h-full min-h-[400px] border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-600">
                <BrainCircuit className="h-16 w-16 mb-4 opacity-20" />
                <p>Awaiting Mission Parameters...</p>
              </div>
            ) : (
              <div className="bg-slate-900 border border-purple-500/30 rounded-xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-2">
                <div className="bg-gradient-to-r from-purple-900/50 to-slate-900 p-6 border-b border-purple-500/20">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold text-white" data-testid="text-strategy-name">{playbook.strategyName}</h2>
                      <p className="text-purple-300 text-sm mt-1">{playbook.thesis}</p>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-lg text-center">
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Risk Score</div>
                      <div className={`text-xl font-bold ${playbook.riskScore > 7 ? 'text-red-500' : 'text-green-500'}`} data-testid="text-risk-score">{playbook.riskScore}/10</div>
                    </div>
                  </div>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Execution Setup</h3>
                    <div className="space-y-2">
                      {playbook.legs?.map((leg: any, i: number) => (
                        <div key={i} className="bg-slate-950 p-3 rounded border border-slate-800 flex justify-between items-center" data-testid={`leg-${i}`}>
                           <span className={`font-bold ${leg.action === 'Buy' ? 'text-green-400' : 'text-red-400'}`}>{leg.action}</span>
                           <span className="text-white">{leg.strike} {leg.type}</span>
                           <span className="text-slate-500 text-xs">{leg.expiry}</span>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                      <div className="bg-green-900/20 border border-green-500/20 p-2 rounded">
                        <div className="text-[10px] text-green-500 uppercase">Target</div>
                        <div className="text-white font-mono text-sm">{playbook.setup?.profitTarget}</div>
                      </div>
                      <div className="bg-slate-800/50 border border-slate-700 p-2 rounded">
                         <div className="text-[10px] text-slate-400 uppercase">Entry</div>
                         <div className="text-white font-mono text-sm">{playbook.setup?.entryZone}</div>
                      </div>
                      <div className="bg-red-900/20 border border-red-500/20 p-2 rounded">
                         <div className="text-[10px] text-red-500 uppercase">Stop Loss</div>
                         <div className="text-white font-mono text-sm">{playbook.setup?.stopLoss}</div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Shield className="h-4 w-4" /> Risk Analysis</h3>
                    <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3">
                      <div><div className="text-xs text-slate-500 uppercase">Delta Exposure</div><p className="text-sm text-slate-300">{playbook.greeks?.delta}</p></div>
                      <div><div className="text-xs text-slate-500 uppercase">Theta Decay</div><p className="text-sm text-slate-300">{playbook.greeks?.theta}</p></div>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-amber-500 bg-amber-900/10 p-3 rounded border border-amber-900/30">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      Warning: Options involve significant risk. Ensure this trade fits your allocated capital of ${capital}.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {mode === 'CRYPTO' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900 border border-orange-500/20 p-6 rounded-xl">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Bitcoin className="h-4 w-4 text-orange-400" /> Crypto Parameters
              </h3>
              <form onSubmit={handleCryptoGenerate} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-500 font-bold uppercase">Target Crypto</label>
                  <div className="relative">
                    <Bitcoin className="absolute left-3 top-3 h-4 w-4 text-orange-500" />
                    <input 
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-9 text-white uppercase font-bold focus:border-orange-500 outline-none" 
                      placeholder="BTC, ETH, SOL..." 
                      value={cryptoSymbol} 
                      onChange={e => setCryptoSymbol(e.target.value)} 
                      required 
                      data-testid="input-crypto-symbol"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-bold uppercase">Allocated Capital</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <input 
                      type="number" 
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-9 text-white font-mono focus:border-orange-500 outline-none" 
                      value={capital} 
                      onChange={e => setCapital(e.target.value)} 
                      data-testid="input-crypto-capital"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-bold uppercase">Trading Timeframe</label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {['scalp', 'swing', 'hodl'].map(tf => (
                      <button 
                        key={tf} 
                        type="button" 
                        onClick={() => setCryptoTimeframe(tf)} 
                        className={`text-xs py-2 rounded border transition-all capitalize ${cryptoTimeframe === tf ? 'bg-orange-600 border-orange-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'}`}
                        data-testid={`button-timeframe-${tf}`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-bold uppercase">Risk Profile</label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {['Conservative', 'Moderate', 'Aggressive'].map(r => (
                      <button 
                        key={r} 
                        type="button" 
                        onClick={() => setRisk(r)} 
                        className={`text-xs py-2 rounded border transition-all ${risk === r ? 'bg-orange-600 border-orange-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'}`}
                        data-testid={`button-crypto-risk-${r.toLowerCase()}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <button 
                  disabled={cryptoLoading} 
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all mt-4 disabled:opacity-50"
                  data-testid="button-generate-crypto"
                >
                  {cryptoLoading ? <span className="animate-pulse">Analyzing Crypto...</span> : <><Zap className="h-4 w-4" /> Generate Crypto Playbook</>}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-8">
            {cryptoError ? (
              <div className="h-full min-h-[400px] border-2 border-dashed border-red-500/20 rounded-xl flex flex-col items-center justify-center text-red-500">
                <AlertTriangle className="h-16 w-16 mb-4 opacity-50" />
                <p className="font-bold">{cryptoError}</p>
                <p className="text-slate-500 text-sm mt-2">Try a different symbol (e.g., BTC, ETH, SOL)</p>
              </div>
            ) : !cryptoPlaybook ? (
              <div className="h-full min-h-[400px] border-2 border-dashed border-orange-500/20 rounded-xl flex flex-col items-center justify-center text-slate-600">
                <Bitcoin className="h-16 w-16 mb-4 opacity-20 text-orange-500" />
                <p>Select a crypto asset to analyze...</p>
              </div>
            ) : (
              <div className="bg-slate-900 border border-orange-500/30 rounded-xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-2">
                <div className="bg-gradient-to-r from-orange-900/50 to-slate-900 p-6 border-b border-orange-500/20">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Bitcoin className="h-6 w-6 text-orange-400" />
                        <h2 className="text-2xl font-bold text-white" data-testid="text-crypto-strategy">{cryptoPlaybook.strategyName}</h2>
                      </div>
                      <p className="text-orange-300 text-sm mt-1">{cryptoPlaybook.thesis}</p>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-lg text-center">
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Risk Score</div>
                      <div className={`text-xl font-bold ${cryptoPlaybook.riskScore > 7 ? 'text-red-500' : 'text-green-500'}`} data-testid="text-crypto-risk">{cryptoPlaybook.riskScore}/10</div>
                    </div>
                  </div>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><TrendingUp className="h-4 w-4 text-orange-400" /> Entry Strategy</h3>
                    <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3">
                      <div><div className="text-xs text-orange-500 uppercase">Entry Zone</div><p className="text-lg text-white font-mono">{cryptoPlaybook.setup?.entryZone}</p></div>
                      <div><div className="text-xs text-orange-500 uppercase">Position Size</div><p className="text-sm text-slate-300">{cryptoPlaybook.setup?.positionSize}</p></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4 text-center">
                      <div className="bg-green-900/20 border border-green-500/20 p-3 rounded">
                        <div className="text-[10px] text-green-500 uppercase">Target 1</div>
                        <div className="text-white font-mono text-sm">{cryptoPlaybook.setup?.target1}</div>
                      </div>
                      <div className="bg-green-900/20 border border-green-500/20 p-3 rounded">
                        <div className="text-[10px] text-green-500 uppercase">Target 2</div>
                        <div className="text-white font-mono text-sm">{cryptoPlaybook.setup?.target2}</div>
                      </div>
                    </div>
                    <div className="bg-red-900/20 border border-red-500/20 p-3 rounded text-center">
                      <div className="text-[10px] text-red-500 uppercase">Stop Loss</div>
                      <div className="text-white font-mono">{cryptoPlaybook.setup?.stopLoss}</div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Shield className="h-4 w-4 text-orange-400" /> Market Analysis</h3>
                    <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3">
                      <div><div className="text-xs text-slate-500 uppercase">Trend</div><p className="text-sm text-slate-300">{cryptoPlaybook.analysis?.trend}</p></div>
                      <div><div className="text-xs text-slate-500 uppercase">Support Levels</div><p className="text-sm text-slate-300">{cryptoPlaybook.analysis?.support}</p></div>
                      <div><div className="text-xs text-slate-500 uppercase">Resistance Levels</div><p className="text-sm text-slate-300">{cryptoPlaybook.analysis?.resistance}</p></div>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-orange-500 bg-orange-900/10 p-3 rounded border border-orange-900/30">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      Warning: Crypto markets are highly volatile and trade 24/7. Never invest more than you can afford to lose.
                    </div>
                  </div>
                </div>
                {cryptoPlaybook.catalysts && (
                  <div className="px-6 pb-6">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Key Catalysts</h3>
                    <div className="flex flex-wrap gap-2">
                      {cryptoPlaybook.catalysts.map((cat: string, i: number) => (
                        <span key={i} className="text-xs bg-orange-900/20 text-orange-400 px-3 py-1 rounded border border-orange-500/30">{cat}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {mode === 'EARNINGS' && (
        <div className="space-y-6">
          
          <div className="bg-slate-900 border border-amber-500/20 p-6 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Upcoming Earnings Scanner</h3>
              <p className="text-slate-400 text-sm">Scan our watchlist for high-volatility events in the next 21 days.</p>
            </div>
            <button 
              onClick={scanEarnings} 
              disabled={scanning}
              className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50"
              data-testid="button-scan-earnings"
            >
              {scanning ? <span className="animate-pulse">Scanning...</span> : <><Search className="h-5 w-5" /> Scan Watchlist</>}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            <div className="md:col-span-4 space-y-3">
              {earningsList.length === 0 && !scanning && (
                <div className="text-center p-8 border-2 border-dashed border-slate-800 rounded-xl text-slate-500">
                  No scan results yet.
                </div>
              )}
              {earningsList.map((item) => (
                <div 
                  key={item.ticker} 
                  onClick={() => generateEarningsPlay(item)}
                  className={`bg-slate-900 p-4 rounded-xl border cursor-pointer transition-all hover:bg-slate-800 ${selectedTicker === item.ticker ? 'border-amber-500 shadow-lg shadow-amber-900/20' : 'border-slate-800 hover:border-amber-500/50'}`}
                  data-testid={`card-earnings-${item.ticker}`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white text-lg">{item.ticker}</span>
                    <span className="text-xs bg-amber-900/30 text-amber-400 px-2 py-1 rounded border border-amber-500/30">{item.daysAway} Days</span>
                  </div>
                  <div className="flex justify-between mt-2 text-sm">
                    <span className="text-slate-500">{item.date}</span>
                    <span className="text-white">${item.price?.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="md:col-span-8">
              {generating ? (
                <div className="h-full flex flex-col items-center justify-center text-amber-500 space-y-4 min-h-[300px]">
                  <Flame className="h-12 w-12 animate-pulse" />
                  <div className="text-lg font-bold">Generating 3 Risk-Adjusted Plays...</div>
                </div>
              ) : earningsPlay && Array.isArray(earningsPlay) && earningsPlay.length > 0 ? (
                <div className="space-y-4 animate-in slide-in-from-right-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-white font-bold text-lg">{selectedTicker}</span>
                    <span className="text-slate-500">Earnings Plays</span>
                  </div>
                  
                  {earningsPlay.map((play: any, idx: number) => {
                    const riskColors: Record<string, { border: string; bg: string; badge: string }> = {
                      'Low': { border: 'border-green-500/30', bg: 'from-green-900/30', badge: 'bg-green-500/20 text-green-400 border-green-500/50' },
                      'Medium': { border: 'border-amber-500/30', bg: 'from-amber-900/30', badge: 'bg-amber-500/20 text-amber-400 border-amber-500/50' },
                      'High': { border: 'border-red-500/30', bg: 'from-red-900/30', badge: 'bg-red-500/20 text-red-400 border-red-500/50' }
                    };
                    const colors = riskColors[play.risk] || riskColors['Medium'];
                    
                    return (
                      <div key={idx} className={`bg-slate-900 border ${colors.border} rounded-xl overflow-hidden`}>
                        <div className={`bg-gradient-to-r ${colors.bg} to-slate-900 p-4 border-b border-slate-800`}>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <span className={`text-xs px-2 py-1 rounded border font-bold ${colors.badge}`}>
                                {play.risk} Risk
                              </span>
                              <h3 className="text-lg font-bold text-white">{play.strategy}</h3>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-slate-500">Implied Move</div>
                              <div className="text-white font-bold">{play.impliedMove}</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 uppercase">Bias:</span>
                            <span className="text-white font-medium">{play.bias}</span>
                          </div>
                          
                          <p className="text-slate-400 text-sm">{play.rationale}</p>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-slate-950 p-2 rounded border border-slate-800">
                              <div className="text-[10px] text-slate-500 uppercase">Leg 1</div>
                              <div className="text-white text-xs font-mono">{play.setup?.leg1}</div>
                            </div>
                            <div className="bg-slate-950 p-2 rounded border border-slate-800">
                              <div className="text-[10px] text-slate-500 uppercase">Leg 2</div>
                              <div className="text-white text-xs font-mono">{play.setup?.leg2 || 'N/A'}</div>
                            </div>
                          </div>
                          
                          <div className="flex gap-4 text-xs">
                            <div><span className="text-green-400">Max Profit:</span> <span className="text-white">{play.maxProfit}</span></div>
                            <div><span className="text-red-400">Max Loss:</span> <span className="text-white">{play.maxLoss}</span></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  <div className="bg-slate-950/50 p-3 rounded text-center text-xs text-slate-500">
                    Warning: Earnings events carry "Binary Risk". Prices can gap significantly beyond the implied move.
                  </div>
                </div>
              ) : (
                <div className="h-full border-2 border-dashed border-slate-800 rounded-xl flex items-center justify-center text-slate-600 min-h-[300px]">
                  Select a stock from the left to generate strategies.
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

import React, { useState } from 'react';
import { BrainCircuit, Search, Zap, Shield, TrendingUp, AlertTriangle, Crosshair, DollarSign } from 'lucide-react';

export default function TheStrategist() {
  const [ticker, setTicker] = useState('');
  const [capital, setCapital] = useState('2000');
  const [risk, setRisk] = useState('Moderate');
  
  const [playbook, setPlaybook] = useState<any>(null);
  const [loading, setLoading] = useState(false);

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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      
      {/* HEADER */}
      <div className="border-b border-slate-800 pb-6">
        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
          <BrainCircuit className="text-purple-500 h-8 w-8" />
          The Strategist <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded border border-purple-500/50">PREMIUM AI</span>
        </h2>
        <p className="text-slate-400 mt-2">Generate personalized option playbooks based on your capital and risk tolerance.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT: MISSION PARAMETERS (Input Form) */}
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-9 text-white uppercase font-bold focus:border-purple-500 outline-none transition-colors"
                    placeholder="e.g. TSLA"
                    value={ticker} onChange={e => setTicker(e.target.value)} required
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
                    value={capital} onChange={e => setCapital(e.target.value)}
                    data-testid="input-strategist-capital"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 font-bold uppercase">Risk Profile</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {['Conservative', 'Moderate', 'Aggressive'].map(r => (
                    <button 
                      key={r} type="button" onClick={() => setRisk(r)}
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

        {/* RIGHT: TACTICAL DISPLAY (AI Output) */}
        <div className="lg:col-span-8">
          {!playbook ? (
            <div className="h-full min-h-[400px] border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-600">
              <BrainCircuit className="h-16 w-16 mb-4 opacity-20" />
              <p>Awaiting Mission Parameters...</p>
            </div>
          ) : (
            <div className="bg-slate-900 border border-purple-500/30 rounded-xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-2">
              
              {/* Header Card */}
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
                
                {/* EXECUTION (Legs) */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" /> Execution Setup
                  </h3>
                  <div className="space-y-2">
                    {playbook.legs?.map((leg: any, i: number) => (
                      <div key={i} className="bg-slate-950 p-3 rounded border border-slate-800 flex justify-between items-center" data-testid={`leg-${i}`}>
                         <span className={`font-bold ${leg.action === 'Buy' ? 'text-green-400' : 'text-red-400'}`}>{leg.action}</span>
                         <span className="text-white">{leg.strike} {leg.type}</span>
                         <span className="text-slate-500 text-xs">{leg.expiry}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Targets */}
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

                {/* GREEKS & RISK */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Shield className="h-4 w-4" /> Risk Analysis
                  </h3>
                  <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3">
                    <div>
                      <div className="text-xs text-slate-500 uppercase">Delta Exposure</div>
                      <p className="text-sm text-slate-300">{playbook.greeks?.delta}</p>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 uppercase">Theta Decay</div>
                      <p className="text-sm text-slate-300">{playbook.greeks?.theta}</p>
                    </div>
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
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Target, Trophy, TrendingDown, Clock, ArrowRight } from 'lucide-react';

export default function TheOracle() {
  const [picks, setPicks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const stats = {
    wins: 12,
    losses: 4,
    winRate: 75,
    streak: 3
  };

  useEffect(() => {
    async function fetchDailyPicks() {
      try {
        const res = await fetch('/api/oracle/daily');
        const json = await res.json();
        if (json.success) setPicks(json.data);
      } catch (e) {
        console.error("Oracle offline");
      } finally {
        setLoading(false);
      }
    }
    fetchDailyPicks();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950 p-8 rounded-2xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="relative z-10">
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <Target className="text-cyan-400 h-8 w-8" />
            The Oracle
          </h2>
          <p className="text-slate-400 mt-2 max-w-2xl">
            High-conviction setups filtered by the Sentinel Engine. 
            These picks represent the highest probability outcomes for today.
          </p>
          
          <div className="flex gap-6 mt-8">
            <div className="bg-slate-950/50 backdrop-blur-md px-6 py-3 rounded-xl border border-slate-700/50">
              <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Win Rate</div>
              <div className="text-2xl font-bold text-green-400">{stats.winRate}%</div>
            </div>
            <div className="bg-slate-950/50 backdrop-blur-md px-6 py-3 rounded-xl border border-slate-700/50">
              <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Current Streak</div>
              <div className="text-2xl font-bold text-cyan-400">{stats.streak} Days</div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          Today's Predictions <span className="text-xs font-normal text-slate-500 bg-slate-800 px-2 py-1 rounded ml-2">Live</span>
        </h3>

        {loading ? (
          <div className="text-center py-20 text-slate-500">Consulting the Oracle...</div>
        ) : picks.length === 0 ? (
          <div className="p-8 border border-dashed border-slate-700 rounded-xl text-center text-slate-500">
            No high-conviction signals found today. The Oracle stays silent.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {picks.map((pick) => (
              <div key={pick.ticker} className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-cyan-500/30 transition-all group" data-testid={`oracle-pick-${pick.ticker}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-2xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                      {pick.ticker}
                    </h4>
                    <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      {pick.signal}
                    </span>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    pick.confidence === 'High' 
                      ? 'bg-green-500/10 text-green-400 border-green-500/30' 
                      : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                  }`}>
                    {pick.confidence} Confidence
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Entry Zone</span>
                    <span className="text-white font-mono">${pick.entryPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Target (AI)</span>
                    <span className="text-cyan-400 font-mono font-bold">${pick.predictedPrice.toFixed(2)}</span>
                  </div>
                  
                  <div className="pt-2">
                    <div className="flex justify-between text-[10px] text-slate-600 mb-1">
                      <span>0%</span>
                      <span>Target Goal</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-cyan-600 to-blue-500 w-[10%] animate-pulse"></div>
                    </div>
                  </div>
                </div>

                <button className="w-full py-2 bg-slate-800 hover:bg-cyan-600 hover:text-white text-slate-300 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2" data-testid={`button-view-analysis-${pick.ticker}`}>
                  View Analysis <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

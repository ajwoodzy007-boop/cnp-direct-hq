import React, { useState, useEffect } from 'react';
import { BookOpen, ExternalLink, Shield, Zap, TrendingUp, RefreshCw, Radio, FileText, X, ChevronRight, Target, BarChart3, Calculator, Crosshair } from 'lucide-react';
import FullReportModal from './FullReportModal';

const fieldManuals = [
  {
    id: 'risk',
    title: 'Risk Management 101',
    icon: Shield,
    color: 'green',
    sections: [
      { title: 'The 1% Rule', content: 'Never risk more than 1-2% of your total portfolio on a single trade. If you have a $10,000 account, your maximum loss per trade should be $100-$200. This ensures that even a string of losses won\'t devastate your account.' },
      { title: 'Position Sizing Formula', content: 'Position Size = (Account Risk $ / Trade Risk $) × Entry Price\n\nExample: $10,000 account, risking 1% ($100), with a $2 stop loss per share:\nPosition Size = ($100 / $2) = 50 shares' },
      { title: 'Stop Loss Placement', content: 'Always set your stop loss BEFORE entering a trade. Place stops at technical levels (below support, above resistance) rather than arbitrary percentages. A good rule: if your stop is too wide for proper position sizing, the trade setup isn\'t worth it.' },
      { title: 'Risk/Reward Ratio', content: 'Only take trades with at least a 2:1 reward-to-risk ratio. If you\'re risking $100, your target profit should be at least $200. This means you can be wrong 50% of the time and still be profitable.' },
      { title: 'The Golden Rules', content: '• Never average down on a losing trade\n• Cut losers quickly, let winners run\n• Don\'t revenge trade after a loss\n• Take profits at predetermined levels\n• Keep a trading journal to track performance' }
    ]
  },
  {
    id: 'rsi',
    title: 'Understanding RSI',
    icon: BarChart3,
    color: 'blue',
    sections: [
      { title: 'What is RSI?', content: 'The Relative Strength Index (RSI) is a momentum oscillator that measures the speed and magnitude of price changes. It ranges from 0 to 100, with readings above 70 considered overbought and below 30 considered oversold.' },
      { title: 'RSI Calculation', content: 'RSI = 100 - (100 / (1 + RS))\n\nWhere RS = Average Gain / Average Loss over the lookback period (typically 14 periods). The Sentinel uses a 14-period RSI for all scans.' },
      { title: 'Overbought vs Oversold', content: 'RSI > 70: Overbought - Price may be due for a pullback. Consider taking profits on long positions or looking for short entries.\n\nRSI < 30: Oversold - Price may be due for a bounce. Look for buying opportunities or cover short positions.' },
      { title: 'RSI Divergence', content: 'Bullish Divergence: Price makes lower lows but RSI makes higher lows → Potential reversal up\n\nBearish Divergence: Price makes higher highs but RSI makes lower highs → Potential reversal down\n\nDivergences are powerful signals but need confirmation.' },
      { title: 'Sentinel RSI Strategy', content: 'The Sentinel looks for:\n• RSI crossing above 50 = Bullish momentum shift\n• RSI > 70 with high RVOL = Strong momentum (ride it)\n• RSI divergence + news catalyst = High conviction setup\n\nCombine RSI with volume and sentiment for best results.' }
    ]
  },
  {
    id: 'greeks',
    title: 'Options Greeks',
    icon: Calculator,
    color: 'purple',
    sections: [
      { title: 'Delta (Δ)', content: 'Measures how much an option\'s price changes for every $1 move in the stock.\n\n• Call Delta: 0 to 1 (ATM calls ≈ 0.50)\n• Put Delta: -1 to 0 (ATM puts ≈ -0.50)\n\nA delta of 0.70 means the option gains $0.70 for every $1 the stock rises.' },
      { title: 'Gamma (Γ)', content: 'Measures the rate of change in Delta. High gamma means delta changes rapidly as the stock moves.\n\n• Highest for at-the-money options\n• Increases as expiration approaches\n• Important for day traders and scalpers' },
      { title: 'Theta (Θ)', content: 'Time decay - how much value an option loses each day.\n\n• Always negative for long options\n• Accelerates as expiration approaches\n• ATM options decay fastest\n\nRule: Avoid holding options with less than 2 weeks to expiration unless you\'re actively trading.' },
      { title: 'Vega (V)', content: 'Measures sensitivity to implied volatility (IV) changes.\n\n• Higher vega = more sensitive to IV changes\n• Buy options when IV is low, sell when IV is high\n• IV usually spikes before earnings and drops after (IV crush)' },
      { title: 'Practical Application', content: 'For swing trades (1-4 weeks):\n• Target Delta 0.60-0.70 for directional bets\n• Buy 30-45 DTE to minimize theta decay\n• Check IV percentile before buying\n\nFor day trades:\n• Use higher delta (0.70+) for more stock-like movement\n• Watch gamma closely near expiration' }
    ]
  },
  {
    id: 'sentinel',
    title: 'The Sentinel Strategy',
    icon: Crosshair,
    color: 'cyan',
    sections: [
      { title: 'Core Philosophy', content: 'The Sentinel identifies high-probability momentum trades by combining three key factors:\n\n1. Price Momentum (Change %)\n2. Volume Confirmation (RVOL)\n3. Sentiment Analysis (News)\n\nWhen all three align, we have a "Sentinel Signal."' },
      { title: 'RVOL (Relative Volume)', content: 'RVOL compares current volume to the stock\'s average volume.\n\n• RVOL > 2.0 = Unusual activity, institutions moving\n• RVOL > 5.0 = Extreme interest, potential breakout\n• RVOL < 0.5 = Low interest, avoid\n\nThe Sentinel requires RVOL > 1.0 for any signal.' },
      { title: 'Signal Types', content: 'MOMENTUM BUY: RSI > 50, RVOL > 1.5, Bullish sentiment\n→ Stock showing strength with volume confirmation\n\nWAIT: Mixed signals or missing criteria\n→ Monitor but don\'t enter yet\n\nThe Sentinel never gives "SELL" signals - it finds momentum, not tops.' },
      { title: 'Entry & Exit Rules', content: 'ENTRY:\n• Wait for signal confirmation (don\'t chase)\n• Enter on pullback to VWAP or key support\n• Size position per 1% risk rule\n\nEXIT:\n• Take 50% profits at 2:1 R/R\n• Trail stop on remaining 50%\n• Exit fully if RSI divergence appears' },
      { title: 'Daily Workflow', content: '7:30 AM: Check Sentinel\'s Top 10 picks\n9:30 AM: Watch first 15 min for setups\n10:00 AM: Enter confirmed trades\nThroughout day: Monitor positions\n3:50 PM: Close day trades before close\n4:15 PM: Review results, journal trades' }
    ]
  }
];

export default function TheAcademy() {
  const [briefing, setBriefing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fullReport, setFullReport] = useState<any>(null);
  const [loadingFull, setLoadingFull] = useState(false);
  const [showFullModal, setShowFullModal] = useState(false);
  const [selectedManual, setSelectedManual] = useState<typeof fieldManuals[0] | null>(null);

  const resources = [
    { name: "TradingView Charts", desc: "Advanced Charting Software", link: "#", icon: TrendingUp },
    { name: "Partner Integrations", desc: "Coming Soon", link: "#", icon: Zap },
    { name: "News & Data Partners", desc: "Coming Soon", link: "#", icon: Shield },
  ];

  useEffect(() => {
    async function fetchBriefing() {
      try {
        const res = await fetch('/api/academy/briefing');
        const json = await res.json();
        if (json.success) setBriefing(json.data);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    fetchBriefing();
  }, []);

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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      <div className="border-b border-slate-800 pb-6">
        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
          <BookOpen className="text-amber-400 h-8 w-8" />
          The Academy
        </h2>
        <p className="text-slate-400 mt-2">
          Market Intelligence Briefings & Educational Resources.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden relative group">
        
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Radio className={`h-5 w-5 ${loading ? 'text-slate-500' : 'text-red-500 animate-pulse'}`} />
            <h3 className="font-bold text-white">Sentinel Daily Briefing</h3>
          </div>
          <span className="text-xs text-amber-500 font-mono border border-amber-500/30 px-2 py-1 rounded bg-amber-500/10" data-testid="text-briefing-date">
            {briefing?.date || 'CONNECTING...'}
          </span>
        </div>

        <div className="p-8 min-h-[200px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
               <RefreshCw className="h-8 w-8 animate-spin" />
               <p>Downloading Market Intel...</p>
            </div>
          ) : briefing ? (
            <div className="animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-3 mb-4">
                 <span className={`px-3 py-1 text-xs font-bold rounded-full border ${
                    briefing.sentiment === 'BULLISH' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                    briefing.sentiment === 'BEARISH' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                    'bg-slate-500/10 text-slate-400 border-slate-500/20'
                 }`} data-testid="text-sentiment">
                    {briefing.sentiment} SENTIMENT
                 </span>
                 <h4 className="text-xl font-bold text-white" data-testid="text-headline">{briefing.headline}</h4>
              </div>
              
              <div className="space-y-4 text-slate-300 leading-relaxed max-w-4xl">
                <p data-testid="text-summary">{briefing.summary}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                   <div className="bg-slate-950 p-4 rounded border border-slate-800">
                      <strong className="text-cyan-400 block mb-1 text-xs uppercase">Key Levels</strong>
                      <span data-testid="text-key-levels">{briefing.keyLevels}</span>
                   </div>
                   <div className="bg-slate-950 p-4 rounded border border-slate-800">
                      <strong className="text-amber-400 block mb-1 text-xs uppercase">Action Plan</strong>
                      <span data-testid="text-action-plan">{briefing.actionPlan}</span>
                   </div>
                </div>
                
                <div className="mt-6 pt-6 border-t border-slate-800 flex justify-end">
                  <button 
                    onClick={handleOpenFullReport}
                    disabled={loadingFull}
                    className="flex items-center gap-2 text-sm font-bold text-cyan-400 hover:text-cyan-300 transition-colors bg-cyan-950/30 hover:bg-cyan-950/50 px-4 py-2 rounded-lg border border-cyan-500/30 disabled:opacity-50"
                    data-testid="button-full-report"
                  >
                    {loadingFull ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                    {loadingFull ? 'Decrypting...' : 'Read Full Intelligence Report'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
             <div className="text-center text-red-400">Briefing Unavailable. Check Uplink.</div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-slate-500" />
          The Armory (Recommended Tools)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {resources.map((res, idx) => {
            const Icon = res.icon;
            return (
              <a 
                key={idx} 
                href={res.link}
                target="_blank" 
                rel="noreferrer"
                className="group bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 p-6 rounded-xl transition-all flex items-start gap-4"
                data-testid={`link-resource-${idx}`}
              >
                <div className="h-10 w-10 bg-slate-950 rounded-lg flex items-center justify-center border border-slate-800 group-hover:border-amber-500/30">
                  <Icon className="text-slate-400 group-hover:text-amber-400 h-5 w-5 transition-colors" />
                </div>
                <div>
                  <div className="font-bold text-white group-hover:text-amber-400 flex items-center gap-2">
                    {res.name} <ExternalLink className="h-3 w-3 opacity-50" />
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{res.desc}</div>
                </div>
              </a>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-white mb-4">Field Manuals</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {fieldManuals.map((manual, i) => {
            const Icon = manual.icon;
            const colorClasses: Record<string, string> = {
              green: 'border-green-500/30 hover:border-green-500/60 hover:bg-green-500/5',
              blue: 'border-blue-500/30 hover:border-blue-500/60 hover:bg-blue-500/5',
              purple: 'border-purple-500/30 hover:border-purple-500/60 hover:bg-purple-500/5',
              cyan: 'border-cyan-500/30 hover:border-cyan-500/60 hover:bg-cyan-500/5'
            };
            const iconColors: Record<string, string> = {
              green: 'text-green-400',
              blue: 'text-blue-400',
              purple: 'text-purple-400',
              cyan: 'text-cyan-400'
            };
            return (
              <div 
                key={manual.id}
                onClick={() => setSelectedManual(manual)}
                className={`bg-slate-950 border p-4 rounded-lg cursor-pointer transition-all ${colorClasses[manual.color]}`}
                data-testid={`card-module-${i}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`h-4 w-4 ${iconColors[manual.color]}`} />
                  <span className="text-xs text-slate-500 uppercase">Module 0{i+1}</span>
                </div>
                <div className="font-bold text-slate-200">{manual.title}</div>
                <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                  {manual.sections.length} lessons <ChevronRight className="h-3 w-3" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showFullModal && fullReport && (
        <FullReportModal data={fullReport} onClose={() => setShowFullModal(false)} />
      )}

      {selectedManual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50 shrink-0">
              <div className="flex items-center gap-3">
                {(() => {
                  const Icon = selectedManual.icon;
                  const iconColors: Record<string, string> = {
                    green: 'text-green-400',
                    blue: 'text-blue-400',
                    purple: 'text-purple-400',
                    cyan: 'text-cyan-400'
                  };
                  return <Icon className={`h-6 w-6 ${iconColors[selectedManual.color]}`} />;
                })()}
                <h3 className="text-xl font-bold text-white">{selectedManual.title}</h3>
              </div>
              <button 
                onClick={() => setSelectedManual(null)} 
                className="text-slate-400 hover:text-white p-1"
                data-testid="button-close-manual"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              {selectedManual.sections.map((section, idx) => (
                <div key={idx} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                      {idx + 1}
                    </span>
                    {section.title}
                  </h4>
                  <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                    {section.content}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-slate-800 bg-slate-950 shrink-0">
              <button
                onClick={() => setSelectedManual(null)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
              >
                Close Manual
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

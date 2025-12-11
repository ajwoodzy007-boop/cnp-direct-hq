import React from 'react';
import { BookOpen, ExternalLink, Scroll, Shield, Zap, TrendingUp } from 'lucide-react';

export default function TheAcademy() {
  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const resources = [
    { name: "TradingView Charts", desc: "Advanced Charting Software", link: "#", icon: TrendingUp },
    { name: "Robinhood / Webull", desc: "Brokerage Account Setup", link: "#", icon: Zap },
    { name: "Benzinga Pro", desc: "Real-time News Squawk", link: "#", icon: Shield },
  ];

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

      <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Scroll className="text-slate-400 h-5 w-5" />
            <h3 className="font-bold text-white">Sentinel Daily Briefing</h3>
          </div>
          <span className="text-xs text-amber-500 font-mono border border-amber-500/30 px-2 py-1 rounded bg-amber-500/10">
            {date}
          </span>
        </div>
        <div className="p-8">
          <h4 className="text-xl font-bold text-white mb-4">Market Outlook: Volatility Expected</h4>
          <div className="space-y-4 text-slate-300 leading-relaxed max-w-4xl">
            <p>
              <strong className="text-white">General Trend:</strong> The S&P 500 is showing signs of consolidation near all-time highs. 
              Sentinel scans indicate a rotation out of Mega-Cap Tech (NVDA, AAPL) into Mid-Cap Industrials.
            </p>
            <p>
              <strong className="text-white">Key Levels:</strong> Watch the <span className="text-cyan-400">4,950</span> level on SPX. 
              A break below this could trigger a larger correction.
            </p>
            <p>
              <strong className="text-white">Sector Watch:</strong> Biotech stocks (XBI) are triggering multiple "Oversold" signals on the Radar. 
              Keep an eye on tickers like <span className="font-mono text-amber-400">LABU</span> for potential reversal plays.
            </p>
          </div>
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
          {['Risk Management 101', 'Understanding RSI', 'Options Greeks', 'The Sentinel Strategy'].map((topic, i) => (
            <div 
              key={i} 
              className="bg-slate-950 border border-slate-800 p-4 rounded-lg hover:border-slate-600 cursor-pointer transition-colors"
              data-testid={`card-manual-${i}`}
            >
              <div className="text-xs text-slate-500 uppercase mb-2">Module 0{i+1}</div>
              <div className="font-bold text-slate-200">{topic}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

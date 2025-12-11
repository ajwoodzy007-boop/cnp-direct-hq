import React, { useState, useEffect } from 'react';
import { BookOpen, ExternalLink, Shield, Zap, TrendingUp, RefreshCw, Radio, FileText } from 'lucide-react';
import FullReportModal from './FullReportModal';

export default function TheAcademy() {
  const [briefing, setBriefing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fullReport, setFullReport] = useState<any>(null);
  const [loadingFull, setLoadingFull] = useState(false);
  const [showFullModal, setShowFullModal] = useState(false);

  const resources = [
    { name: "TradingView Charts", desc: "Advanced Charting Software", link: "#", icon: TrendingUp },
    { name: "Robinhood / Webull", desc: "Brokerage Account Setup", link: "#", icon: Zap },
    { name: "Benzinga Pro", desc: "Real-time News Squawk", link: "#", icon: Shield },
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
          {['Risk Management 101', 'Understanding RSI', 'Options Greeks', 'The Sentinel Strategy'].map((topic, i) => (
            <div 
              key={i} 
              className="bg-slate-950 border border-slate-800 p-4 rounded-lg hover:border-slate-600 cursor-pointer transition-colors"
              data-testid={`card-module-${i}`}
            >
              <div className="text-xs text-slate-500 uppercase mb-2">Module 0{i+1}</div>
              <div className="font-bold text-slate-200">{topic}</div>
            </div>
          ))}
        </div>
      </div>

      {showFullModal && fullReport && (
        <FullReportModal data={fullReport} onClose={() => setShowFullModal(false)} />
      )}
    </div>
  );
}

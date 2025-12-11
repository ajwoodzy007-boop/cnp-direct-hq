import React from 'react';
import { Lock, Star, CheckCircle, ShieldCheck } from 'lucide-react';

interface Props {
  featureName: string;
}

export default function PremiumLock({ featureName }: Props) {
  return (
    <div className="h-full w-full flex items-center justify-center p-8 animate-in fade-in duration-500">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-10 max-w-3xl text-center relative overflow-hidden shadow-2xl">
        
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="relative z-10">
          <div className="h-20 w-20 bg-slate-950 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-slate-800 shadow-inner">
            <Lock className="h-10 w-10 text-amber-500" />
          </div>

          <h2 className="text-3xl font-bold text-white mb-3">
            {featureName} is Locked
          </h2>
          <p className="text-slate-400 mb-8 max-w-lg mx-auto text-lg">
            Upgrade to <span className="text-amber-400 font-bold">Sentinel Pro</span> to unlock AI-powered strategies, real-time signals, and institutional risk analysis.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mb-10 bg-slate-950/50 p-6 rounded-xl border border-slate-800/50">
            {[
              "AI Options Scanner & Greeks",
              "Real-Time Entry/Exit Signals",
              "Portfolio Correlation Matrix",
              "Unlimited Watchlists",
              "Morning Market Briefings",
              "Priority Support"
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-slate-300">
                <CheckCircle className="h-5 w-5 text-cyan-400 shrink-0" />
                <span className="font-medium">{feature}</span>
              </div>
            ))}
          </div>

          <button 
            data-testid="button-upgrade-premium"
            className="w-full md:w-auto bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold py-4 px-10 rounded-xl flex items-center justify-center gap-3 mx-auto transition-all transform hover:scale-105 shadow-lg shadow-orange-900/20"
          >
            <Star className="h-5 w-5 fill-white" />
            Upgrade to Pro - $29/mo
          </button>
          
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 mt-6">
            <ShieldCheck className="h-4 w-4" /> 30-Day Money Back Guarantee • Cancel Anytime
          </div>
        </div>
      </div>
    </div>
  );
}

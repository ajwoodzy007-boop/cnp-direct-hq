import React from 'react';
import { Lock, Star, CheckCircle } from 'lucide-react';

interface Props {
  featureName: string;
}

export default function PremiumLock({ featureName }: Props) {
  return (
    <div className="h-full w-full flex items-center justify-center p-8">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-2xl text-center relative overflow-hidden shadow-2xl">
        
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
          <div className="h-16 w-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-700">
            <Lock className="h-8 w-8 text-amber-400" />
          </div>

          <h2 className="text-3xl font-bold text-white mb-2">
            {featureName} is a Premium Feature
          </h2>
          <p className="text-slate-400 mb-8 max-w-lg mx-auto">
            Unlock the full power of the Sentinel AI engine. Get real-time signals, options playbooks, and institutional-grade risk analysis.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mb-8">
            <div className="flex items-center gap-3 text-slate-300">
              <CheckCircle className="h-5 w-5 text-cyan-400 shrink-0" />
              <span>AI Options Scanner</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <CheckCircle className="h-5 w-5 text-cyan-400 shrink-0" />
              <span>Real-Time Entry/Exit Signals</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <CheckCircle className="h-5 w-5 text-cyan-400 shrink-0" />
              <span>Portfolio Correlation Matrix</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <CheckCircle className="h-5 w-5 text-cyan-400 shrink-0" />
              <span>Unlimited Watchlists</span>
            </div>
          </div>

          <button 
            data-testid="button-upgrade-premium"
            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold py-3 px-8 rounded-full flex items-center gap-2 mx-auto transition-all transform hover:scale-105"
          >
            <Star className="h-5 w-5 fill-current" />
            Upgrade to Premium
          </button>
          
          <p className="text-xs text-slate-500 mt-4">
            30-Day Money Back Guarantee • Cancel Anytime
          </p>
        </div>
      </div>
    </div>
  );
}

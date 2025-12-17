import React from 'react';
import { LockClosedIcon, CheckCircleIcon, ShieldCheckIcon, TicketIcon } from '@heroicons/react/24/outline';
import { Link } from 'wouter';

interface Props {
  featureName: string;
}

export default function PremiumLock({ featureName }: Props) {
  return (
    <div className="h-full w-full flex items-center justify-center p-8 animate-in fade-in duration-500">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-4xl text-center relative overflow-hidden shadow-2xl">
        
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          <div className="text-left">
            <h2 className="text-3xl font-bold text-white mb-4">
              Unlock {featureName}
            </h2>
            <p className="text-slate-400 mb-6 text-lg leading-relaxed">
              Join the elite traders using AI to find an edge. One winning trade pays for the entire year.
            </p>
            
            <div className="space-y-3 mb-8">
              {[
                "Real-Time Entry/Exit Signals",
                "AI Options Playbooks",
                "Institutional Risk Scoring",
                "Unlimited Portfolio Tracking",
                "Priority 24/7 Support"
              ].map((feat, i) => (
                <div key={i} className="flex items-center gap-3 text-slate-300">
                  <CheckCircleIcon className="h-5 w-5 text-cyan-400 shrink-0" />
                  <span className="font-medium">{feat}</span>
                </div>
              ))}
            </div>
            
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheckIcon className="h-4 w-4" /> Beta passes available for early access
            </div>
          </div>

          <div className="space-y-4">
            
            <div className="bg-gradient-to-br from-purple-900/30 to-slate-900 border border-purple-500/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <TicketIcon className="h-8 w-8 text-purple-400" />
                <div>
                  <div className="text-lg font-bold text-white">Beta Access</div>
                  <div className="text-sm text-slate-400">Get early access with a beta pass</div>
                </div>
              </div>
              <p className="text-sm text-slate-400 mb-4">
                Have a beta pass? Go to your profile settings to redeem it and unlock all Pro features.
              </p>
              <div className="text-center">
                <Link href="/" className="inline-block bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold px-6 py-2 rounded-lg transition-colors">
                  Go to Dashboard
                </Link>
              </div>
            </div>

            <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-center">
              <LockClosedIcon className="h-8 w-8 text-slate-600 mx-auto mb-2" />
              <div className="text-sm text-slate-500">
                Premium subscriptions coming soon
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

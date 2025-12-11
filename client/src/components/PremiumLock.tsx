import React, { useState } from 'react';
import { Lock, Star, CheckCircle, ShieldCheck, Zap } from 'lucide-react';

interface Props {
  featureName: string;
}

export default function PremiumLock({ featureName }: Props) {
  const [loading, setLoading] = useState(false);

  const MONTHLY_PRICE_ID = 'price_1SdDuH0frj5koTyzbAtvR2eu'; 
  const ANNUAL_PRICE_ID = 'price_1SdDv70frj5koTyzyFjhc9n1';

  const handleCheckout = async (priceId: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId })
      });
      const json = await res.json();
      if (json.url) {
        window.open(json.url, '_blank');
      } else {
        alert("Checkout failed to initialize.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

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
                  <CheckCircle className="h-5 w-5 text-cyan-400 shrink-0" />
                  <span className="font-medium">{feat}</span>
                </div>
              ))}
            </div>
            
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4" /> 7-Day Free Trial • Cancel Anytime
            </div>
          </div>

          <div className="space-y-4">
            
            <div className="relative group cursor-pointer" onClick={() => handleCheckout(ANNUAL_PRICE_ID)} data-testid="button-checkout-annual">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl opacity-75 group-hover:opacity-100 transition duration-200 blur"></div>
              <div className="relative bg-slate-900 rounded-xl p-6 border border-slate-800 flex justify-between items-center hover:bg-slate-800 transition-colors">
                <div className="text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-bold text-white">Annual Plan</span>
                    <span className="bg-amber-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full">SAVE 20%</span>
                  </div>
                  <div className="text-sm text-slate-400">$249 / year</div>
                  <div className="text-xs text-green-400 mt-1">7 Days Free, then billed yearly</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">$20<span className="text-sm text-slate-500 font-normal">/mo</span></div>
                  <button disabled={loading} className="mt-2 bg-white text-black text-xs font-bold px-3 py-1.5 rounded-lg">
                    {loading ? '...' : 'Start Trial'}
                  </button>
                </div>
              </div>
            </div>

            <div 
              onClick={() => handleCheckout(MONTHLY_PRICE_ID)}
              className="bg-slate-950/50 border border-slate-800 rounded-xl p-6 flex justify-between items-center hover:border-slate-600 cursor-pointer transition-colors"
              data-testid="button-checkout-monthly"
            >
              <div className="text-left">
                <div className="text-lg font-bold text-white">Monthly Plan</div>
                <div className="text-sm text-slate-500">Flexible, cancel anytime</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-white">$29<span className="text-sm text-slate-500 font-normal">/mo</span></div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

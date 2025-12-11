import React from 'react';
import { Shield, FileText, AlertTriangle, ArrowLeft } from 'lucide-react';

interface Props {
  page: 'terms' | 'privacy' | 'risk';
  onBack: () => void;
}

export default function LegalPage({ page, onBack }: Props) {
  
  const renderContent = () => {
    switch (page) {
      case 'terms':
        return (
          <div className="space-y-4 text-slate-300">
            <h3 className="text-xl font-bold text-white mb-4">Terms of Service</h3>
            <p className="text-sm text-slate-500 mb-6">Last Updated: {new Date().toLocaleDateString()}</p>
            
            <section>
              <h4 className="font-bold text-white mb-2">1. Acceptance of Terms</h4>
              <p>By creating an account or accessing CNP Direct ("Sentinel OS"), you agree to be bound by these terms. If you disagree with any part of the terms, you may not access the service.</p>
            </section>

            <section>
              <h4 className="font-bold text-white mb-2">2. License to Use</h4>
              <p>We grant you a limited, non-exclusive, non-transferable license to use our software for personal, non-commercial analysis purposes.</p>
            </section>

            <section>
              <h4 className="font-bold text-white mb-2">3. Subscriptions & Payments</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Billing:</strong> Premium features are billed in advance on a monthly or annual basis.</li>
                <li><strong>Cancellation:</strong> You may cancel your subscription at any time via your account settings. Access continues until the end of the billing period.</li>
                <li><strong>Refunds:</strong> We offer a 7-day free trial. Generally, payments made after the trial are non-refundable unless required by law.</li>
              </ul>
            </section>
          </div>
        );
      case 'privacy':
        return (
          <div className="space-y-4 text-slate-300">
            <h3 className="text-xl font-bold text-white mb-4">Privacy Policy</h3>
            
            <section>
              <h4 className="font-bold text-white mb-2">1. Data We Collect</h4>
              <p>We collect your email address for account authentication and usage data (such as which tickers you analyze) to improve our AI models.</p>
            </section>

            <section>
              <h4 className="font-bold text-white mb-2">2. Payment Security</h4>
              <p>We do <strong>not</strong> store your credit card information on our servers. All payments are processed securely by Stripe, a PCI-compliant payment processor.</p>
            </section>

            <section>
              <h4 className="font-bold text-white mb-2">3. Data Sharing</h4>
              <p>We do not sell, trade, or rent your personal identification information to third parties (e.g., hedge funds or advertisers).</p>
            </section>
          </div>
        );
      case 'risk':
        return (
          <div className="space-y-6">
            <div className="border-l-4 border-amber-500 pl-4 py-1">
              <h3 className="text-xl font-bold text-amber-500 flex items-center gap-2">
                <AlertTriangle className="h-6 w-6" /> Risk Disclosure
              </h3>
            </div>
            
            <div className="bg-amber-950/20 p-6 rounded-lg border border-amber-900/30 text-amber-100/80 leading-relaxed">
              <p className="font-bold text-white mb-4">CNP DIRECT IS NOT A REGISTERED INVESTMENT ADVISOR.</p>
              <p className="mb-4">
                Trading in financial markets (stocks, options, ETFs) involves a high degree of risk and may not be suitable for all investors. You could lose some or all of your initial investment.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>The content provided by "The Oracle" and "The Strategist" consists of <strong>algorithmic analysis</strong> based on historical data and probability models.</li>
                <li><strong>Past performance is not indicative of future results.</strong> The market is unpredictable.</li>
                <li>You acknowledge that you are solely responsible for your own trading decisions.</li>
                <li>Do not trade with money you cannot afford to lose.</li>
              </ul>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center py-12 px-4 animate-in fade-in slide-in-from-bottom-4">
      <div className="w-full max-w-3xl">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 mb-8 transition-colors font-medium"
          data-testid="button-back-legal"
        >
          <ArrowLeft className="h-4 w-4" /> Return to Terminal
        </button>
        
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 md:p-12 shadow-2xl">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

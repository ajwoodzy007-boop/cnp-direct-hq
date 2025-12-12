import React from 'react';
import { 
  X, ShieldCheck, Radar, Target, BrainCircuit, Briefcase, BookOpen, 
  TrendingUp, Zap, CheckCircle, Star, ArrowRight, Crown
} from 'lucide-react';

interface Props {
  onClose: () => void;
  onSignUp?: () => void;
  isLoggedIn?: boolean;
}

export default function AboutModal({ onClose, onSignUp, isLoggedIn }: Props) {
  const features = [
    {
      icon: Radar,
      title: 'The Radar',
      subtitle: 'Real-Time Market Scanner',
      description: 'AI-powered scanner detecting momentum shifts, unusual volume, and sentiment changes across the entire market in real-time.',
      color: 'cyan',
      free: true
    },
    {
      icon: Target,
      title: 'The Oracle',
      subtitle: 'Daily Top 10 Predictions',
      description: 'Every morning at 7:30 AM ET, our AI generates 10 high-conviction stock picks with entry prices, targets, and confidence scores.',
      color: 'amber',
      free: false
    },
    {
      icon: BrainCircuit,
      title: 'The Strategist',
      subtitle: 'AI Trading Playbooks',
      description: '8 powerful AI tools: Options signals with Greeks, risk assessment, pattern recognition, earnings plays, and portfolio optimization.',
      color: 'pink',
      free: false
    },
    {
      icon: Briefcase,
      title: 'The Vault',
      subtitle: 'Portfolio Tracker',
      description: 'Track your holdings, monitor performance, and get AI-powered insights on your portfolio allocation and risk exposure.',
      color: 'purple',
      free: false
    },
    {
      icon: BookOpen,
      title: 'The Academy',
      subtitle: 'Market Intelligence',
      description: 'Daily AI briefings, sector analysis, and comprehensive field manuals covering risk management, technical analysis, and trading strategies.',
      color: 'blue',
      free: true
    }
  ];

  const premiumBenefits = [
    'Daily Top 10 AI Predictions with 65%+ accuracy',
    'Options signals with strike prices & Greeks',
    'Real-time risk assessment & position sizing',
    'Pattern recognition & chart analysis',
    'Earnings play strategies',
    'Portfolio optimization recommendations',
    'Priority access to new features'
  ];

  const colorMap: Record<string, { bg: string; border: string; text: string }> = {
    cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400' },
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' },
    pink: { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-400' },
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400' },
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto">
      <div className="min-h-full flex items-start justify-center p-4 py-8">
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl">
        
        <div className="relative p-8 border-b border-slate-800 text-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-cyan-500/5" />
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg transition-colors"
            data-testid="button-close-about"
          >
            <X className="h-6 w-6" />
          </button>
          
          <div className="relative">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <ShieldCheck className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">CNP DIRECT</h1>
            <p className="text-cyan-400 font-mono text-sm tracking-widest mb-4">SENTINEL TRADING INTELLIGENCE</p>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Your AI-powered command center for smarter trading decisions. Real-time market scanning, 
              daily predictions, and institutional-grade analysis tools.
            </p>
          </div>
        </div>

        <div className="p-8 space-y-8">
          
          <div>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Zap className="h-5 w-5 text-cyan-400" />
              Platform Features
            </h2>
            <div className="grid gap-4">
              {features.map((feature) => {
                const Icon = feature.icon;
                const colors = colorMap[feature.color];
                return (
                  <div 
                    key={feature.title}
                    className={`${colors.bg} border ${colors.border} rounded-xl p-5 hover:scale-[1.01] transition-transform`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`h-12 w-12 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center shrink-0`}>
                        <Icon className={`h-6 w-6 ${colors.text}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-white">{feature.title}</h3>
                          <span className="text-xs text-slate-500">•</span>
                          <span className={`text-sm ${colors.text}`}>{feature.subtitle}</span>
                          {feature.free ? (
                            <span className="ml-auto text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded border border-green-500/30">FREE</span>
                          ) : (
                            <span className="ml-auto text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded border border-amber-500/30 flex items-center gap-1">
                              <Crown className="h-3 w-3" /> PREMIUM
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-400">{feature.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-gradient-to-r from-amber-900/20 via-amber-800/20 to-amber-900/20 border border-amber-500/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Crown className="h-6 w-6 text-amber-400" />
              <h2 className="text-xl font-bold text-white">Premium Membership</h2>
              <span className="ml-auto text-2xl font-bold text-amber-400">$29<span className="text-sm text-slate-400">/month</span></span>
            </div>
            <div className="grid md:grid-cols-2 gap-3 mb-6">
              {premiumBenefits.map((benefit, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                  <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
                  {benefit}
                </div>
              ))}
            </div>
            {!isLoggedIn && onSignUp && (
              <button
                onClick={onSignUp}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20"
                data-testid="button-about-signup"
              >
                Get Started Free <ArrowRight className="h-5 w-5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className="text-2xl font-bold text-cyan-400">65%+</div>
              <div className="text-xs text-slate-500 mt-1">Prediction Accuracy</div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className="text-2xl font-bold text-cyan-400">10</div>
              <div className="text-xs text-slate-500 mt-1">Daily AI Picks</div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className="text-2xl font-bold text-cyan-400">8</div>
              <div className="text-xs text-slate-500 mt-1">AI Tools</div>
            </div>
          </div>

          <div className="text-center pt-4 border-t border-slate-800">
            <div className="flex items-center justify-center gap-1 text-amber-400 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-current" />
              ))}
            </div>
            <p className="text-sm text-slate-400 italic">
              "The Sentinel's daily picks have completely changed how I trade. Finally, a tool that actually delivers."
            </p>
            <p className="text-xs text-slate-600 mt-1">— Active Trader, Premium Member</p>
          </div>

        </div>

        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-600">
            CNP DIRECT © 2024 • For educational purposes only
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}

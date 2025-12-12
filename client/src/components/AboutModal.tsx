import React, { useState } from 'react';
import { 
  X, ShieldCheck, Radar, Target, BrainCircuit, Briefcase, BookOpen, 
  TrendingUp, Zap, CheckCircle, Star, ArrowRight, Crown, Clock, 
  BarChart3, Lock, Sparkles, ChevronDown, ChevronUp, Users, 
  Shield, Cpu, LineChart, AlertTriangle, Gift
} from 'lucide-react';

interface Props {
  onClose: () => void;
  onSignUp?: () => void;
  isLoggedIn?: boolean;
}

export default function AboutModal({ onClose, onSignUp, isLoggedIn }: Props) {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const features = [
    {
      icon: Radar,
      title: 'The Radar',
      subtitle: 'Real-Time Market Scanner',
      description: 'AI-powered scanner detecting momentum shifts, unusual volume, and sentiment changes across stocks and crypto in real-time.',
      color: 'cyan',
      free: true
    },
    {
      icon: Target,
      title: 'The Oracle',
      subtitle: 'Daily Top 10 Predictions',
      description: 'Every morning at 9:00 AM ET, our AI generates 10 high-conviction picks with entry prices, targets, stop-losses, and confidence scores.',
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

  const howItWorks = [
    {
      step: 1,
      title: 'Wake Up to AI Picks',
      description: 'Every morning at 9:00 AM ET, The Oracle delivers 10 AI-analyzed stock picks directly to your dashboard.',
      icon: Clock
    },
    {
      step: 2,
      title: 'Review & Execute',
      description: 'Each pick includes entry price, target, stop-loss, confidence score, and AI reasoning. You decide which to trade.',
      icon: Target
    },
    {
      step: 3,
      title: 'Track Performance',
      description: 'At market close, we compare predictions to actual results. Full transparency with historical accuracy tracking.',
      icon: BarChart3
    }
  ];

  const testimonials = [
    {
      quote: "The Oracle's daily picks have completely transformed my trading. 3 consecutive winning days and counting!",
      author: "Michael R.",
      role: "Day Trader",
      rating: 5
    },
    {
      quote: "Finally, an AI tool that actually delivers. The entry/target/stop-loss system takes the guesswork out of trading.",
      author: "Sarah K.",
      role: "Swing Trader",
      rating: 5
    },
    {
      quote: "The Strategist's options signals are incredible. Greeks analysis saved me from several bad trades.",
      author: "David L.",
      role: "Options Trader",
      rating: 5
    }
  ];

  const faqs = [
    {
      question: "How accurate are The Oracle's predictions?",
      answer: "Our AI tracks and publishes all prediction results transparently. You can view historical accuracy in The Oracle section, including win rates, average returns, and performance streaks. We believe in full transparency—no cherry-picking results."
    },
    {
      question: "When are predictions generated?",
      answer: "Stock predictions are generated at 9:00 AM ET (30 minutes before market open) using the latest pre-market data. Crypto predictions are generated at 8:00 AM ET. All predictions are locked and timestamped—no changes after generation."
    },
    {
      question: "What's included in the free tier?",
      answer: "Free users get full access to The Radar (real-time market scanner), The Academy (educational content and market briefings), and can view The Oracle's historical performance. Premium unlocks daily predictions, AI tools, and portfolio features."
    },
    {
      question: "Can I cancel anytime?",
      answer: "Absolutely. No contracts, no hidden fees. Cancel your premium subscription anytime through your account settings. You'll retain access until the end of your billing period."
    },
    {
      question: "Is my data secure?",
      answer: "Yes. We use industry-standard encryption, never share your data, and don't require brokerage connections. Your trading decisions remain 100% private."
    }
  ];

  const comparisonFeatures = [
    { feature: 'Real-Time Market Scanner (The Radar)', free: true, premium: true },
    { feature: 'Market Education (The Academy)', free: true, premium: true },
    { feature: 'View Historical Predictions', free: true, premium: true },
    { feature: 'Daily Top 10 Stock Predictions', free: false, premium: true },
    { feature: 'Daily Top 10 Crypto Predictions', free: false, premium: true },
    { feature: 'Entry/Target/Stop-Loss Prices', free: false, premium: true },
    { feature: 'AI Confidence Scores', free: false, premium: true },
    { feature: 'Options Signals with Greeks', free: false, premium: true },
    { feature: 'Pattern Recognition', free: false, premium: true },
    { feature: 'Portfolio Optimizer', free: false, premium: true },
    { feature: 'Earnings Play Analysis', free: false, premium: true },
    { feature: 'Risk Assessment Tools', free: false, premium: true },
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
        
        <div className="relative p-8 md:p-12 border-b border-slate-800 text-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-cyan-500/5" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg transition-colors z-10"
            data-testid="button-close-about"
          >
            <X className="h-6 w-6" />
          </button>
          
          <div className="relative">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 animate-pulse">
                <ShieldCheck className="h-9 w-9 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">CNP DIRECT</h1>
            <p className="text-cyan-400 font-mono text-sm tracking-widest mb-6">SENTINEL TRADING INTELLIGENCE</p>
            
            <h2 className="text-xl md:text-2xl text-white font-semibold mb-4">
              AI-Powered Trading Signals.<br className="md:hidden" /> Delivered Daily.
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">
              Wake up to 10 high-conviction stock picks every morning. Entry prices, targets, stop-losses, 
              and AI confidence scores—all before the market opens.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Shield className="h-4 w-4 text-green-400" />
                <span>No brokerage connection</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Lock className="h-4 w-4 text-green-400" />
                <span>Bank-level encryption</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Cpu className="h-4 w-4 text-cyan-400" />
                <span>GPT-4o powered</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-10">

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-gradient-to-b from-cyan-500/10 to-transparent border border-cyan-500/20 rounded-xl p-4">
              <div className="text-3xl font-bold text-cyan-400">10</div>
              <div className="text-xs text-slate-400 mt-1">Daily Stock Picks</div>
            </div>
            <div className="bg-gradient-to-b from-orange-500/10 to-transparent border border-orange-500/20 rounded-xl p-4">
              <div className="text-3xl font-bold text-orange-400">10</div>
              <div className="text-xs text-slate-400 mt-1">Daily Crypto Picks</div>
            </div>
            <div className="bg-gradient-to-b from-green-500/10 to-transparent border border-green-500/20 rounded-xl p-4">
              <div className="text-3xl font-bold text-green-400">9:00</div>
              <div className="text-xs text-slate-400 mt-1">AM ET Delivery</div>
            </div>
            <div className="bg-gradient-to-b from-purple-500/10 to-transparent border border-purple-500/20 rounded-xl p-4">
              <div className="text-3xl font-bold text-purple-400">8</div>
              <div className="text-xs text-slate-400 mt-1">AI Trading Tools</div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-amber-900/30 via-amber-800/20 to-amber-900/30 border border-amber-500/40 rounded-xl p-4 flex items-center gap-3">
            <Gift className="h-6 w-6 text-amber-400 shrink-0" />
            <div className="flex-1">
              <span className="text-amber-300 font-semibold">Limited Beta Pricing:</span>
              <span className="text-slate-300 ml-2">Lock in $29/month forever—price increases to $49/month after beta.</span>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <LineChart className="h-5 w-5 text-cyan-400" />
              How It Works
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              {howItWorks.map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.step} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 relative">
                    <div className="absolute -top-3 -left-3 h-8 w-8 rounded-full bg-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                      {step.step}
                    </div>
                    <div className="flex items-center gap-3 mb-3 mt-2">
                      <Icon className="h-5 w-5 text-cyan-400" />
                      <h3 className="font-semibold text-white">{step.title}</h3>
                    </div>
                    <p className="text-sm text-slate-400">{step.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
          
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
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
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

          <div>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-cyan-400" />
              Free vs Premium
            </h2>
            <div className="bg-slate-800/30 border border-slate-700 rounded-xl overflow-hidden">
              <div className="grid grid-cols-3 bg-slate-800/50 p-3 border-b border-slate-700">
                <div className="text-sm font-medium text-slate-400">Feature</div>
                <div className="text-sm font-medium text-center text-slate-400">Free</div>
                <div className="text-sm font-medium text-center text-amber-400">Premium</div>
              </div>
              <div className="divide-y divide-slate-700/50">
                {comparisonFeatures.map((item, i) => (
                  <div key={i} className="grid grid-cols-3 p-3 hover:bg-slate-800/30 transition-colors">
                    <div className="text-sm text-slate-300">{item.feature}</div>
                    <div className="text-center">
                      {item.free ? (
                        <CheckCircle className="h-5 w-5 text-green-400 mx-auto" />
                      ) : (
                        <X className="h-5 w-5 text-slate-600 mx-auto" />
                      )}
                    </div>
                    <div className="text-center">
                      <CheckCircle className="h-5 w-5 text-green-400 mx-auto" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-amber-900/20 via-amber-800/20 to-amber-900/20 border border-amber-500/30 rounded-xl p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
              <div className="flex items-center gap-3">
                <Crown className="h-8 w-8 text-amber-400" />
                <div>
                  <h2 className="text-xl font-bold text-white">Premium Membership</h2>
                  <p className="text-sm text-slate-400">Unlock the full power of AI trading intelligence</p>
                </div>
              </div>
              <div className="md:ml-auto text-center md:text-right">
                <div className="flex items-baseline gap-2 justify-center md:justify-end">
                  <span className="text-3xl font-bold text-amber-400">$29</span>
                  <span className="text-slate-400">/month</span>
                </div>
                <div className="text-xs text-slate-500 line-through">$49/month after beta</div>
              </div>
            </div>
            
            {!isLoggedIn && onSignUp && (
              <button
                onClick={onSignUp}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 text-lg"
                data-testid="button-about-signup"
              >
                Start Your Free Trial <ArrowRight className="h-5 w-5" />
              </button>
            )}
            {isLoggedIn && (
              <div className="text-center text-slate-400 py-2">
                You're already a member! Upgrade to Premium in your account settings.
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-400" />
              What Traders Are Saying
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              {testimonials.map((testimonial, i) => (
                <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                  <div className="flex items-center gap-0.5 mb-3">
                    {[...Array(testimonial.rating)].map((_, j) => (
                      <Star key={j} className="h-4 w-4 text-amber-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-sm text-slate-300 italic mb-4">"{testimonial.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold">
                      {testimonial.author.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{testimonial.author}</div>
                      <div className="text-xs text-slate-500">{testimonial.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-cyan-400" />
              Frequently Asked Questions
            </h2>
            <div className="space-y-2">
              {faqs.map((faq, i) => (
                <div key={i} className="bg-slate-800/30 border border-slate-700 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors"
                  >
                    <span className="font-medium text-white">{faq.question}</span>
                    {expandedFaq === i ? (
                      <ChevronUp className="h-5 w-5 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-400 shrink-0" />
                    )}
                  </button>
                  {expandedFaq === i && (
                    <div className="px-4 pb-4 text-sm text-slate-400">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6 text-center">
            <Sparkles className="h-8 w-8 text-cyan-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Ready to Trade Smarter?</h3>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              Join traders who wake up every morning with AI-powered trading intelligence on their side.
            </p>
            {!isLoggedIn && onSignUp ? (
              <button
                onClick={onSignUp}
                className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-lg inline-flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
                data-testid="button-about-cta-bottom"
              >
                Get Started Free <ArrowRight className="h-5 w-5" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-lg inline-flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
              >
                Explore the Platform <ArrowRight className="h-5 w-5" />
              </button>
            )}
          </div>

        </div>

        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-600 text-center md:text-left">
            CNP DIRECT © 2024 • For educational purposes only • Not financial advice
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

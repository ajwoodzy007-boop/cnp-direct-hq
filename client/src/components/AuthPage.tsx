import React, { useState } from 'react';
import { 
  ShieldCheck, Mail, Lock, ChevronRight, UserPlus, LogIn, AlertTriangle,
  Target, Radar, BrainCircuit, CheckCircle, Star, TrendingUp, Zap,
  Clock, BarChart3, Crown, Gift, ArrowRight
} from 'lucide-react';

interface AuthProps {
  onLogin: (user: any) => void;
}

export default function AuthPage({ onLogin }: AuthProps) {
  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP'>('SIGNUP');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = mode === 'LOGIN' ? '/api/auth/login' : '/api/auth/signup';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const json = await res.json();
      
      if (json.success) {
        onLogin(json.user);
      } else {
        setError(json.error || 'Access Denied');
      }
    } catch (err) {
      setError('Connection Error: Sentinel Offline');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Target, text: '10 AI Stock Picks Daily at 9:00 AM ET' },
    { icon: Radar, text: 'Real-Time Market Scanner' },
    { icon: BrainCircuit, text: '8 AI Trading Tools' },
    { icon: BarChart3, text: 'Full Performance Transparency' },
  ];

  const testimonials = [
    {
      quote: "The Oracle's daily picks changed how I trade. 3 winning days in a row!",
      author: "Michael R.",
      role: "Day Trader"
    },
    {
      quote: "Finally, AI that actually delivers. Entry prices, targets, stop-losses—all before market open.",
      author: "Sarah K.",
      role: "Swing Trader"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex">
      
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950/30" />
        <div className="absolute top-[20%] left-[30%] w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[20%] right-[20%] w-64 h-64 bg-blue-500/10 rounded-full blur-[80px]" />
        
        <div className="relative z-10 flex flex-col justify-center p-12 xl:p-16 max-w-2xl mx-auto">
          
          <div className="flex items-center gap-3 mb-8">
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <ShieldCheck className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-wide">CNP DIRECT</h1>
              <p className="text-xs text-cyan-400 tracking-widest">SENTINEL TRADING INTELLIGENCE</p>
            </div>
          </div>

          <h2 className="text-3xl xl:text-4xl font-bold text-white mb-4 leading-tight">
            AI-Powered Trading Signals.<br />
            <span className="text-cyan-400">Delivered Daily.</span>
          </h2>
          
          <p className="text-slate-400 text-lg mb-8">
            Wake up to 10 high-conviction stock picks every morning—with entry prices, 
            targets, and stop-losses calculated by AI.
          </p>

          <div className="space-y-4 mb-10">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-cyan-400" />
                  </div>
                  <span className="text-slate-300">{feature.text}</span>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-3 gap-4 mb-10">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-cyan-400">10</div>
              <div className="text-xs text-slate-500">Daily Picks</div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-cyan-400">9:00</div>
              <div className="text-xs text-slate-500">AM Delivery</div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-cyan-400">8</div>
              <div className="text-xs text-slate-500">AI Tools</div>
            </div>
          </div>

          <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center gap-0.5 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 text-amber-400 fill-current" />
              ))}
            </div>
            <p className="text-slate-300 italic mb-3">
              "{testimonials[0].quote}"
            </p>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                {testimonials[0].author.charAt(0)}
              </div>
              <div>
                <div className="text-sm text-white font-medium">{testimonials[0].author}</div>
                <div className="text-xs text-slate-500">{testimonials[0].role}</div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          
          <div className="lg:hidden text-center mb-6">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30 mb-3">
              <ShieldCheck className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-wide">CNP DIRECT</h1>
            <p className="text-xs text-cyan-400 tracking-widest mt-1">AI TRADING INTELLIGENCE</p>
          </div>

          {/* Mobile Feature Showcase */}
          <div className="lg:hidden mb-5 space-y-3">
            {/* The Oracle Card */}
            <div className="bg-gradient-to-r from-cyan-900/20 to-slate-900/50 border border-cyan-500/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
                  <Target className="h-5 w-5 text-cyan-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-white">The Oracle</h3>
                  <p className="text-xs text-slate-400 mt-0.5">10 AI stock picks daily at 9:00 AM with entry, target & stop-loss</p>
                </div>
              </div>
            </div>
            
            {/* The Strategist Card */}
            <div className="bg-gradient-to-r from-purple-900/20 to-slate-900/50 border border-purple-500/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                  <BrainCircuit className="h-5 w-5 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-white">The Strategist</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Deep AI analysis on any stock or crypto in seconds</p>
                </div>
              </div>
            </div>
            
            {/* Quick Stats Row */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-cyan-400">10</div>
                <div className="text-[10px] text-slate-500">Daily Picks</div>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-purple-400">8</div>
                <div className="text-[10px] text-slate-500">AI Tools</div>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-green-400">24/7</div>
                <div className="text-[10px] text-slate-500">Access</div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 border border-amber-500/30 rounded-xl p-3 mb-5 flex items-center gap-3">
            <Gift className="h-5 w-5 text-amber-400 shrink-0" />
            <div className="text-sm">
              <span className="text-amber-300 font-semibold">Beta:</span>
              <span className="text-slate-300 ml-1">$29/mo locked forever</span>
            </div>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl">
            
            <div className="flex bg-slate-950 p-1 rounded-lg mb-6 border border-slate-800">
              <button 
                onClick={() => setMode('LOGIN')}
                className={`flex-1 py-2.5 text-sm font-bold rounded-md flex items-center justify-center gap-2 transition-all ${mode === 'LOGIN' ? 'bg-slate-800 text-cyan-400 shadow' : 'text-slate-500 hover:text-slate-300'}`}
                data-testid="tab-login"
              >
                <LogIn className="h-4 w-4" /> Login
              </button>
              <button 
                onClick={() => setMode('SIGNUP')}
                className={`flex-1 py-2.5 text-sm font-bold rounded-md flex items-center justify-center gap-2 transition-all ${mode === 'SIGNUP' ? 'bg-slate-800 text-amber-400 shadow' : 'text-slate-500 hover:text-slate-300'}`}
                data-testid="tab-signup"
              >
                <UserPlus className="h-4 w-4" /> Sign Up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div className="space-y-1">
                <label className="text-xs text-slate-500 font-medium uppercase ml-1">Email</label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-3.5 h-5 w-5 text-slate-500 group-focus-within:text-white transition-colors" />
                  <input 
                    type="email"
                    required
                    className="w-full bg-slate-950 border border-slate-800 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-slate-600"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    data-testid="input-email"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-500 font-medium uppercase ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-3.5 h-5 w-5 text-slate-500 group-focus-within:text-white transition-colors" />
                  <input 
                    type="password"
                    required
                    className="w-full bg-slate-950 border border-slate-800 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-slate-600"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    data-testid="input-password"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 p-3 rounded-lg border border-red-400/20 animate-in fade-in">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className={`w-full font-bold py-3.5 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-2
                  ${mode === 'LOGIN' 
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20' 
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/20'
                  }`}
                data-testid="button-submit"
              >
                {loading ? 'Processing...' : (
                  <>
                    {mode === 'LOGIN' ? 'Sign In' : 'Create Free Account'} 
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {mode === 'SIGNUP' && (
              <div className="mt-6 pt-6 border-t border-slate-800">
                <div className="text-xs text-slate-500 text-center mb-3">What you get for free:</div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
                    Real-time market scanner (The Radar)
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
                    Market education & daily briefings
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
                    View historical prediction performance
                  </div>
                </div>
              </div>
            )}

            {mode === 'LOGIN' && (
              <div className="mt-6 text-center">
                <button 
                  onClick={() => setMode('SIGNUP')}
                  className="text-sm text-slate-400 hover:text-cyan-400 transition-colors"
                >
                  Don't have an account? <span className="text-cyan-400 font-medium">Sign up free</span>
                </button>
              </div>
            )}
          </div>

          <div className="text-center mt-6 text-xs text-slate-600">
            By signing up, you agree to our Terms of Service
          </div>

          <div className="lg:hidden mt-8 bg-slate-800/30 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-0.5 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-3 w-3 text-amber-400 fill-current" />
              ))}
            </div>
            <p className="text-sm text-slate-400 italic">
              "{testimonials[0].quote}"
            </p>
            <div className="text-xs text-slate-500 mt-2">— {testimonials[0].author}, {testimonials[0].role}</div>
          </div>

        </div>
      </div>
    </div>
  );
}

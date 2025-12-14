import React, { useState } from 'react';
import { ShieldCheckIcon, LockClosedIcon, ChevronRightIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface LoginProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      
      const json = await res.json();
      
      if (json.success) {
        onLogin();
      } else {
        setError('ACCESS DENIED: Invalid Clearance Code');
      }
    } catch (err) {
      setError('SYSTEM ERROR: Connection Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] left-[20%] w-96 h-96 bg-cyan-900/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[20%] right-[20%] w-96 h-96 bg-blue-900/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl mb-4">
            <ShieldCheckIcon className="h-10 w-10 text-cyan-500" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-widest font-mono" data-testid="text-logo">CNP DIRECT</h1>
          <div className="text-xs text-cyan-500 mt-2 uppercase tracking-[0.3em]">Sentinel Access Control</div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-2">
              <label className="text-xs text-slate-500 font-bold uppercase ml-1">Access Key</label>
              <div className="relative group">
                <LockClosedIcon className="absolute left-3 top-3.5 h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                <input 
                  type="password"
                  className="w-full bg-slate-950 border border-slate-800 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-slate-600"
                  placeholder="Enter Security Code..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                  data-testid="input-password"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 p-3 rounded-lg border border-red-400/20 animate-in fade-in slide-in-from-top-1" data-testid="text-error">
                <ExclamationTriangleIcon className="h-4 w-4" />
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3.5 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
              data-testid="button-login"
            >
              {loading ? (
                <span className="animate-pulse">Verifying Credentials...</span>
              ) : (
                <>
                  Authenticate System <ChevronRightIcon className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="text-center mt-8 text-[10px] text-slate-600 font-mono">
          SECURE CONNECTION • 256-BIT ENCRYPTION • ID: {Math.floor(Math.random() * 999999)}
        </div>
      </div>
    </div>
  );
}

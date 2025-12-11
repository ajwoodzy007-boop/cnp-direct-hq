import React from 'react';
import { Shield, UserPlus, LogIn } from 'lucide-react';

interface Props {
  featureName: string;
  onLoginClick: () => void;
}

export default function AuthLock({ featureName, onLoginClick }: Props) {
  return (
    <div className="h-full w-full flex items-center justify-center p-8 animate-in fade-in duration-500">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-10 max-w-2xl text-center relative overflow-hidden shadow-2xl">
        
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none"></div>

        <div className="relative z-10">
          <div className="h-16 w-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-slate-700">
            <Shield className="h-8 w-8 text-cyan-400" />
          </div>

          <h2 className="text-3xl font-bold text-white mb-3">
            Member Access Required
          </h2>
          <p className="text-slate-400 mb-8 max-w-md mx-auto">
            <span className="text-cyan-400 font-bold">{featureName}</span> allows you to track trades and save data. You must be logged in to access this secure terminal.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={onLoginClick}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-8 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-900/20"
              data-testid="button-create-account"
            >
              <UserPlus className="h-5 w-5" />
              Create Free Account
            </button>
            <button 
              onClick={onLoginClick}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 px-8 rounded-xl flex items-center justify-center gap-2 transition-all border border-slate-700"
              data-testid="button-login"
            >
              <LogIn className="h-5 w-5" />
              Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

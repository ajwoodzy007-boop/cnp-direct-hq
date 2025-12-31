import React from 'react';
import { LockClosedIcon } from '@heroicons/react/24/outline';

interface Props {
  featureName: string;
  onLoginClick: () => void;
}

export default function AuthLock({ featureName, onLoginClick }: Props) {
  return (
    <div className="h-full w-full flex items-center justify-center p-8 animate-in fade-in duration-500">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-md text-center">
        <LockClosedIcon className="h-16 w-16 text-slate-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">
          Sign In Required
        </h2>
        <p className="text-slate-400 mb-6">
          Please sign in to access {featureName}.
        </p>
        <button
          onClick={onLoginClick}
          className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-6 py-3 rounded-lg transition-colors"
        >
          Sign In / Join
        </button>
      </div>
    </div>
  );
}


import React, { useState } from 'react';
import { XMarkIcon, UserCircleIcon, ArrowRightOnRectangleIcon, ShieldCheckIcon, TicketIcon } from '@heroicons/react/24/outline';

interface Props {
  user: { email: string; tier: string };
  onClose: () => void;
  onLogout: () => void;
  isAdmin?: boolean;
  onAdminClick?: () => void;
}

export default function SettingsModal({ user, onClose, onLogout, isAdmin, onAdminClick }: Props) {
  const [betaCode, setBetaCode] = useState('');
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemMessage, setRedeemMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleRedeemBeta = async () => {
    if (!betaCode.trim()) return;
    setRedeemLoading(true);
    setRedeemMessage(null);
    try {
      const res = await fetch('/api/auth/redeem-beta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: betaCode })
      });
      const json = await res.json();
      if (json.success) {
        setRedeemMessage({ type: 'success', text: json.message });
        setBetaCode('');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setRedeemMessage({ type: 'error', text: json.error });
      }
    } catch (e) {
      setRedeemMessage({ type: 'error', text: 'Failed to redeem code' });
    } finally {
      setRedeemLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl relative overflow-hidden">
        
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <UserCircleIcon className="text-cyan-400 h-5 w-5" /> Operative Profile
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white" data-testid="button-close-settings">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          <div className="flex items-center gap-4">
            <div className={`h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-lg ${
               user.tier === 'PREMIUM' ? 'bg-gradient-to-tr from-amber-500 to-orange-600' : 'bg-gradient-to-tr from-cyan-600 to-blue-600'
            }`}>
              {user.email.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="text-white font-bold" data-testid="text-user-email">{user.email}</div>
              <div className="text-xs flex items-center gap-1.5 mt-1">
                <span className={`h-2 w-2 rounded-full ${user.tier === 'PREMIUM' ? 'bg-amber-500' : 'bg-green-400'}`}></span>
                <span className="text-slate-400 uppercase tracking-wider" data-testid="text-user-tier">{user.tier} ACCESS</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-800">

            {user.tier !== 'PREMIUM' && (
              <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TicketIcon className="h-4 w-4 text-purple-400" />
                  <span className="text-sm font-medium text-purple-400">Have a Beta Pass?</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={betaCode}
                    onChange={(e) => setBetaCode(e.target.value.toUpperCase())}
                    placeholder="BETA-XXXXXXXX"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder-slate-500 font-mono"
                    data-testid="input-beta-code"
                  />
                  <button
                    onClick={handleRedeemBeta}
                    disabled={redeemLoading || !betaCode.trim()}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="button-redeem-beta"
                  >
                    {redeemLoading ? '...' : 'Redeem'}
                  </button>
                </div>
                {redeemMessage && (
                  <div className={`mt-2 text-xs ${redeemMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                    {redeemMessage.text}
                  </div>
                )}
              </div>
            )}

            {isAdmin && onAdminClick && (
              <button 
                onClick={onAdminClick}
                className="w-full bg-red-900/20 hover:bg-red-900/30 text-red-400 p-3 rounded-lg flex items-center justify-between group transition-all border border-red-500/20 hover:border-red-500/40"
                data-testid="button-admin-dashboard"
              >
                <div className="flex items-center gap-3">
                  <ShieldCheckIcon className="h-5 w-5" />
                  <div className="text-sm font-medium">Admin Dashboard</div>
                </div>
                <div className="text-xs text-red-500/70">Command Center</div>
              </button>
            )}

            <button 
              onClick={onLogout}
              className="w-full bg-slate-950 hover:bg-red-900/10 text-slate-400 hover:text-red-400 p-3 rounded-lg flex items-center justify-between group transition-all border border-slate-800 hover:border-red-500/30"
              data-testid="button-logout"
            >
              <div className="flex items-center gap-3">
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                <div className="text-sm font-medium">Terminate Session</div>
              </div>
            </button>
          </div>

        </div>

        <div className="p-4 bg-slate-950 text-center text-[10px] text-slate-600">
           ID: {user.email.split('@')[0].toUpperCase()}-772 • SECURE CONNECTION
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { X, CreditCard, User, LogOut, Shield } from 'lucide-react';

interface Props {
  user: { email: string; tier: string };
  onClose: () => void;
  onLogout: () => void;
  isAdmin?: boolean;
  onAdminClick?: () => void;
}

export default function SettingsModal({ user, onClose, onLogout, isAdmin, onAdminClick }: Props) {
  const [loading, setLoading] = useState(false);

  const handleManageBilling = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const json = await res.json();
      if (json.url) {
        window.location.href = json.url;
      } else {
        alert(json.error || "Billing portal unavailable.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl relative overflow-hidden">
        
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <User className="text-cyan-400 h-5 w-5" /> Operative Profile
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white" data-testid="button-close-settings">
            <X className="h-6 w-6" />
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
            
            <button 
              onClick={handleManageBilling}
              disabled={loading}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-lg flex items-center justify-between group transition-all border border-slate-700 hover:border-cyan-500/30 disabled:opacity-50"
              data-testid="button-manage-billing"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-slate-400 group-hover:text-cyan-400" />
                <div className="text-sm font-medium">{loading ? 'Loading...' : 'Manage Subscription'}</div>
              </div>
              <div className="text-xs text-slate-500 group-hover:text-white">Invoices & Cancel</div>
            </button>

            {isAdmin && onAdminClick && (
              <button 
                onClick={onAdminClick}
                className="w-full bg-red-900/20 hover:bg-red-900/30 text-red-400 p-3 rounded-lg flex items-center justify-between group transition-all border border-red-500/20 hover:border-red-500/40"
                data-testid="button-admin-dashboard"
              >
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5" />
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
                <LogOut className="h-5 w-5" />
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

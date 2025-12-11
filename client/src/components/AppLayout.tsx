import React, { useState } from 'react';
import { 
  Radar, 
  BrainCircuit, 
  Target, 
  BookOpen, 
  LayoutDashboard, 
  Menu,
  ShieldCheck,
  LogOut,
  LogIn
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentTab: string;
  setTab: (tab: string) => void;
  user: { email: string; tier: string } | null;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  onLegalClick: (page: 'terms' | 'privacy' | 'risk') => void;
}

export default function AppLayout({ 
  children, currentTab, setTab, user, onLoginClick, onLogoutClick, onLegalClick 
}: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { id: 'radar', label: 'The Radar', icon: Radar, desc: 'Scanner & News' },
    { id: 'oracle', label: 'The Oracle', icon: Target, desc: 'Daily Predictions' },
    { id: 'strategist', label: 'The Strategist', icon: BrainCircuit, desc: 'AI Playbooks' },
    { id: 'vault', label: 'The Vault', icon: LayoutDashboard, desc: 'Portfolio' },
    { id: 'academy', label: 'The Academy', icon: BookOpen, desc: 'Education' },
  ];

  const handleNavClick = (tabId: string) => {
    setTab(tabId);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex overflow-hidden">
      
      <aside 
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 shadow-2xl transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0
        `}
      >
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800">
          <ShieldCheck className="text-cyan-500 h-8 w-8" />
          <div>
            <h1 className="font-bold text-white tracking-wide">CNP DIRECT</h1>
            <p className="text-[10px] text-cyan-500 font-mono tracking-widest">SENTINEL OS v2.0</p>
          </div>
        </div>

        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all group
                  ${isActive 
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }
                `}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-white'}`} />
                <div className="text-left">
                  <div className="font-medium">{item.label}</div>
                  <div className="text-[10px] opacity-60 font-mono uppercase">{item.desc}</div>
                </div>
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800 bg-slate-900/50">
          {user ? (
            <button 
              onClick={onLogoutClick}
              className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-800 transition-all group"
              data-testid="button-user-profile"
            >
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                user.tier === 'PREMIUM' ? 'bg-gradient-to-tr from-amber-500 to-orange-600' : 'bg-gradient-to-tr from-cyan-600 to-blue-600'
              }`}>
                {user.email.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 overflow-hidden text-left">
                <div className="text-sm font-medium text-white truncate group-hover:text-cyan-400 transition-colors">{user.email.split('@')[0]}</div>
                <div className="text-[10px] flex items-center gap-1">
                  <span className={`h-1.5 w-1.5 rounded-full ${user.tier === 'PREMIUM' ? 'bg-amber-500' : 'bg-green-400'}`}></span>
                  <span className="opacity-70">{user.tier} OPERATIVE</span>
                </div>
              </div>
            </button>
          ) : (
            <button 
              onClick={onLoginClick}
              className="w-full bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 hover:border-cyan-500/30 font-bold py-2 rounded-lg text-sm transition-all flex items-center justify-center gap-2"
            >
              <LogIn className="h-4 w-4" />
              Sign In / Join
            </button>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        <header className="md:hidden h-16 bg-slate-900 border-b border-slate-800 flex items-center px-4 justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-cyan-500 h-6 w-6" />
            <span className="font-bold text-white">CNP DIRECT</span>
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-400 p-2 hover:text-white">
            <Menu className="h-6 w-6" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-950">
          <div className="max-w-7xl mx-auto space-y-8 pb-20">
            {children}
            
            <div className="pt-12 pb-6 text-center border-t border-slate-900 mt-8">
              <div className="flex justify-center gap-6 text-xs text-slate-500 mb-4">
                <button 
                  onClick={() => onLegalClick('privacy')} 
                  className="hover:text-cyan-400 transition-colors"
                  data-testid="link-privacy"
                >
                  Privacy Policy
                </button>
                <button 
                  onClick={() => onLegalClick('terms')} 
                  className="hover:text-cyan-400 transition-colors"
                  data-testid="link-terms"
                >
                  Terms of Service
                </button>
                <button 
                  onClick={() => onLegalClick('risk')} 
                  className="hover:text-amber-500 transition-colors font-bold flex items-center gap-1"
                  data-testid="link-risk"
                >
                  Risk Disclosure
                </button>
              </div>
              <p className="text-[10px] text-slate-700">
                CNP Direct | Market Sentinel is a research tool for educational purposes only. 
                Not financial advice.
              </p>
            </div>
          </div>
        </div>
      </main>

      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

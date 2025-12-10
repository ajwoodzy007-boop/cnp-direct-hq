import React, { useState } from 'react';
import { 
  Radar, 
  BrainCircuit, 
  Target, 
  BookOpen, 
  LayoutDashboard, 
  Menu,
  ShieldCheck,
  LogOut
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentTab: string;
  setTab: (tab: string) => void;
}

export default function AppLayout({ children, currentTab, setTab }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navItems = [
    { id: 'radar', label: 'The Radar', icon: Radar, desc: 'Scanner & News' },
    { id: 'oracle', label: 'The Oracle', icon: Target, desc: 'Daily Predictions' },
    { id: 'strategist', label: 'The Strategist', icon: BrainCircuit, desc: 'AI Playbooks' },
    { id: 'vault', label: 'The Vault', icon: LayoutDashboard, desc: 'Portfolio' },
    { id: 'academy', label: 'The Academy', icon: BookOpen, desc: 'Education' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex overflow-hidden">
      
      <aside 
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 ease-in-out
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
                onClick={() => setTab(item.id)}
                data-testid={`nav-${item.id}`}
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
          <div className="flex items-center gap-3 px-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white">
              JD
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-white">John Doe</div>
              <div className="text-xs text-green-400">● Systems Online</div>
            </div>
            <LogOut className="h-4 w-4 text-slate-500 hover:text-red-400 cursor-pointer" />
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        <header className="md:hidden h-16 bg-slate-900 border-b border-slate-800 flex items-center px-4 justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-cyan-500 h-6 w-6" />
            <span className="font-bold text-white">CNP DIRECT</span>
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-400" data-testid="button-toggle-sidebar">
            <Menu />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-950">
          <div className="max-w-7xl mx-auto space-y-8">
            {children}
            
            <div className="pt-12 pb-6 text-center">
              <p className="text-xs text-slate-600">
                ⚠️ LEGAL DISCLAIMER: CNP Direct | Market Sentinel is a research tool for educational purposes only. 
                Data is automated and not financial advice.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

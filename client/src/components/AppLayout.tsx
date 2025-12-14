import React, { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { 
  LayoutDashboard, 
  LineChart, 
  Shield, 
  History, 
  Menu, 
  X, 
  LogOut, 
  User as UserIcon,
  GraduationCap, 
  Radar 
} from 'lucide-react';
import { useAuth } from "../hooks/use-auth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { label: 'Command Center', path: '/', icon: LayoutDashboard },
    { label: 'The Radar', path: '/radar', icon: Radar },
    { label: 'The Oracle', path: '/oracle', icon: Shield },
    { label: 'The Strategist', path: '/strategist', icon: LineChart },
    { label: 'The Academy', path: '/academy', icon: GraduationCap },
    { label: 'The Vault', path: '/history', icon: History }, // Renamed from "History Log"
  ];

  const handleLogout = async () => {
    await logout();
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden" key={user?.id || 'guest'}>

      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between px-4 z-50 backdrop-blur-md">
        <div className="font-bold text-xl tracking-wider text-white">
          CNP<span className="text-cyan-500">DIRECT</span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-slate-300">
          {sidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      <div className={`
        fixed inset-y-0 left-0 w-64 bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 z-40
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          <div className="p-6 hidden lg:block">
            <h1 className="text-2xl font-black tracking-widest text-white">
              CNP<span className="text-cyan-500">DIRECT</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">Sentinel OS v1.0</p>
          </div>

          <nav className="flex-1 px-4 space-y-2 mt-16 lg:mt-0">
            {navItems.map((item) => (
              <div 
                key={item.path} 
                onClick={() => {
                  setLocation(item.path);
                  setSidebarOpen(false);
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all ${
                  location === item.path 
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <item.icon size={20} />
                <span className="font-bold text-sm tracking-wide">{item.label}</span>
              </div>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-800 bg-slate-900/50">
            {user ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 px-2">
                  <div className="h-8 w-8 rounded-full bg-cyan-900/50 flex items-center justify-center border border-cyan-500/30">
                    <UserIcon size={14} className="text-cyan-400" />
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-sm font-bold text-white truncate">{user.email}</div>
                    <div className="text-xs text-cyan-500 font-mono">{user.tier} OPERATIVE</div>
                  </div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <LogOut size={14} /> DISCONNECT
                </button>
              </div>
            ) : (
              <Link href="/auth">
                <button className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 rounded-lg text-xs tracking-wider transition-all">
                  INITIALIZE LOGIN
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pt-16 lg:pt-0 scrollbar-hide">
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </div>

      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
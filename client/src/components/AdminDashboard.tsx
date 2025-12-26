import React from 'react';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Users, 
  TrendingUp, 
  Database, 
  RefreshCw, 
  ArrowLeft,
  DollarSign,
  PieChart,
  ShieldCheck,
  Activity
} from 'lucide-react';

interface AdminDashboardProps {
  onBack: () => void;
}

export default function AdminDashboard({ onBack }: AdminDashboardProps) {
  const queryClient = useQueryClient();

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ["/api/admin/stats"],
    refetchInterval: 10000 
  });

  const { data: diag } = useQuery({
    queryKey: ["/api/admin/diagnostics"]
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-mono">
      {/* HEADER: Professional Sentinel Branding */}
      <div className="max-w-7xl mx-auto mb-10 flex items-center justify-between border-b border-slate-800 pb-6">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-3 hover:bg-slate-900 rounded-xl text-cyan-500 transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tighter">SENTINEL_COMMAND_CENTER</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em]">Business Intelligence & Asset Management</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-4 bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-800">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-500">DB_STATUS</span>
            <span className="text-xs text-green-400 font-bold">{diag?.status || "CONNECTED"}</span>
          </div>
          <Activity size={20} className="text-green-500 animate-pulse" />
        </div>
      </div>

      {/* SECTION 1: EXECUTIVE SUMMARY (REVENUE) */}
      <div className="max-w-7xl mx-auto mb-12">
        <h2 className="text-xs font-bold text-slate-500 mb-6 uppercase tracking-widest flex items-center gap-2">
          <DollarSign size={14} className="text-emerald-500" />
          Financial Performance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group hover:border-emerald-500/30 transition-all">
            <p className="text-[10px] text-slate-500 uppercase mb-1">Monthly Recurring (MRR)</p>
            <p className="text-3xl font-black text-white">{stats?.mrr || "$0"}</p>
            <div className="mt-2 text-[10px] text-emerald-500 font-bold">+12% vs last month</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group hover:border-cyan-500/30 transition-all">
            <p className="text-[10px] text-slate-500 uppercase mb-1">Annual Run Rate (ARR)</p>
            <p className="text-3xl font-black text-white">{stats?.arr || "$0"}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group hover:border-purple-500/30 transition-all">
            <p className="text-[10px] text-slate-500 uppercase mb-1">Conversion Rate</p>
            <p className="text-3xl font-black text-white">{stats?.conversionRate || "0%"}</p>
            <p className="text-[10px] text-slate-500 mt-2 italic text-purple-400">Free to Premium</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden">
            <p className="text-[10px] text-slate-500 uppercase mb-1">Verified Win Rate</p>
            <p className="text-3xl font-black text-emerald-400">{stats?.winRate || "0%"}</p>
          </div>
        </div>
      </div>

      {/* SECTION 2: OPERATIONAL METRICS */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* User Growth */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Users size={14} className="text-blue-500" />
            Platform Adoption
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl flex items-center gap-6">
              <div className="p-4 bg-blue-500/10 rounded-xl text-blue-500">
                <Users size={32} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.totalUsers || 0}</p>
                <p className="text-[10px] text-slate-500 uppercase">Registered Operatives</p>
              </div>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl flex items-center gap-6">
              <div className="p-4 bg-cyan-500/10 rounded-xl text-cyan-500">
                <TrendingUp size={32} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.totalPredictions || 0}</p>
                <p className="text-[10px] text-slate-500 uppercase">AI Signals Generated</p>
              </div>
            </div>
          </div>
        </div>

        {/* TURNKEY CONTROLS */}
        <div className="space-y-6">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <ShieldCheck size={14} className="text-orange-500" />
            Asset Control
          </h2>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <button 
              onClick={async () => {
                const res = await fetch('/api/oracle/daily?refresh=true');
                if (res.ok) queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
              }}
              className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black rounded-xl transition-all flex items-center justify-center gap-3 text-xs uppercase"
            >
              <RefreshCw size={16} />
              Regenerate Market Picks
            </button>
            <button className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all text-xs uppercase border border-slate-700">
              Finalize All Pending
            </button>
            <p className="text-[10px] text-slate-500 text-center italic">
              Use these tools to maintain "Turnkey" signal freshess for buyers.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

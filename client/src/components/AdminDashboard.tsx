import React, { useState } from 'react';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Users, TrendingUp, RefreshCw, ArrowLeft,
  DollarSign, ShieldCheck, Activity, CheckCircle, Clock
} from 'lucide-react';
import { toast } from "sonner";

interface AdminDashboardProps {
  onBack: () => void;
}

export default function AdminDashboard({ onBack }: AdminDashboardProps) {
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ["/api/admin/stats"],
    refetchInterval: 10000 
  });

  const { data: diag } = useQuery({
    queryKey: ["/api/admin/diagnostics"]
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-mono">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-10 flex items-center justify-between border-b border-slate-800 pb-6">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-3 hover:bg-slate-900 rounded-xl text-cyan-500">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold text-white uppercase tracking-tighter">Sentinel_HQ</h1>
        </div>
        <div className="bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-800 flex items-center gap-3">
          <span className="text-[10px] text-slate-500 uppercase">Latency: {diag?.latency || "..."}</span>
          <Activity size={16} className="text-green-500 animate-pulse" />
        </div>
      </div>

      {/* REVENUE CARDS */}
      <div className="max-w-7xl mx-auto mb-10 grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl border-t-emerald-500/50">
          <p className="text-[10px] text-slate-500 uppercase mb-1">Monthly (MRR)</p>
          <p className="text-3xl font-black text-white">{stats?.mrr || "$0"}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl border-t-cyan-500/50">
          <p className="text-[10px] text-slate-500 uppercase mb-1">Annual (ARR)</p>
          <p className="text-3xl font-black text-white">{stats?.arr || "$0"}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl border-t-purple-500/50">
          <p className="text-[10px] text-slate-500 uppercase mb-1">Conversion</p>
          <p className="text-3xl font-black text-purple-400">{stats?.conversionRate || "0%"}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl border-t-orange-500/50">
          <p className="text-[10px] text-slate-500 uppercase mb-1">AI Win Rate</p>
          <p className="text-3xl font-black text-emerald-400">{stats?.winRate || "0%"}</p>
        </div>
      </div>

      {/* HEARTBEAT SECTION */}
      <div className="max-w-7xl mx-auto mb-10 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl flex items-center gap-4">
          <Clock size={24} className="text-cyan-500" />
          <div>
            <p className="text-[10px] text-slate-500 uppercase">Last Signal Generation (09:00 AM ET)</p>
            <p className="text-sm font-bold text-white">{stats?.lastGeneration}</p>
          </div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl flex items-center gap-4">
          <CheckCircle size={24} className="text-emerald-500" />
          <div>
            <p className="text-[10px] text-slate-500 uppercase">Last Market Finalization (16:30 PM ET)</p>
            <p className="text-sm font-bold text-white">{stats?.lastFinalization}</p>
          </div>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 p-8 rounded-3xl">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-4xl font-bold text-white">{stats?.totalUsers || 0}</p>
              <p className="text-xs text-slate-500 uppercase">Total Users</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-white">{stats?.totalPredictions || 0}</p>
              <p className="text-xs text-slate-500 uppercase">Total Signals</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl flex flex-col gap-4">
          <button 
            onClick={async () => {
              toast.loading("Regenerating signals...");
              await fetch('/api/oracle/daily?refresh=true');
              queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
              toast.success("Done.");
            }}
            className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black rounded-xl text-xs uppercase"
          >
            Regenerate Picks
          </button>
          <button 
            disabled={isProcessing}
            onClick={async () => {
              setIsProcessing(true);
              const res = await fetch('/api/admin/finalize-all', { method: 'POST' });
              if (res.ok) {
                toast.success("Finalization complete.");
                queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
              }
              setIsProcessing(false);
            }}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs uppercase"
          >
            Finalize All Pending
          </button>
        </div>
      </div>
    </div>
  );
}

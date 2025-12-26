import React, { useState } from 'react';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Users, TrendingUp, Database, RefreshCw, ArrowLeft,
  DollarSign, ShieldCheck, Activity, CheckCircle
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

  const handleFinalize = async () => {
    setIsProcessing(true);
    toast.info("Starting global finalization...");
    try {
      const res = await fetch('/api/admin/finalize-all', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      } else {
        toast.error("Finalization failed: " + json.error);
      }
    } catch (e) {
      toast.error("Network error during finalization.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-mono">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-10 flex items-center justify-between border-b border-slate-800 pb-6">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-3 hover:bg-slate-900 rounded-xl text-cyan-500 transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tighter uppercase">Sentinel_Command</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em]">Live Business Intelligence</p>
          </div>
        </div>
        <div className="bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-800 flex items-center gap-3">
          <span className="text-[10px] text-slate-500 uppercase">System_Health</span>
          <span className="text-xs text-green-400 font-bold">{diag?.status || "ONLINE"}</span>
          <Activity size={16} className="text-green-500 animate-pulse" />
        </div>
      </div>

      {/* Financial Metrics */}
      <div className="max-w-7xl mx-auto mb-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <p className="text-[10px] text-slate-500 uppercase mb-1">Monthly Revenue (MRR)</p>
            <p className="text-3xl font-black text-white">{stats?.mrr || "$0"}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <p className="text-[10px] text-slate-500 uppercase mb-1">Annual Run Rate (ARR)</p>
            <p className="text-3xl font-black text-white">{stats?.arr || "$0"}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <p className="text-[10px] text-slate-500 uppercase mb-1">Conversion Rate</p>
            <p className="text-3xl font-black text-purple-400">{stats?.conversionRate || "0%"}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <p className="text-[10px] text-slate-500 uppercase mb-1">Verified Accuracy</p>
            <p className="text-3xl font-black text-emerald-400">{stats?.winRate || "0%"}</p>
          </div>
        </div>
      </div>

      {/* Main Controls */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 p-8 rounded-3xl">
          <h2 className="text-sm font-bold text-white mb-6 uppercase flex items-center gap-2">
            <TrendingUp size={18} className="text-cyan-500" />
            Platform Stats
          </h2>
          <div className="grid grid-cols-2 gap-8">
            <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800/50">
              <p className="text-4xl font-bold text-white mb-1">{stats?.totalUsers || 0}</p>
              <p className="text-xs text-slate-500 uppercase">Registered Users</p>
            </div>
            <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800/50">
              <p className="text-4xl font-bold text-white mb-1">{stats?.totalPredictions || 0}</p>
              <p className="text-xs text-slate-500 uppercase">Total Predictions</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 border border-cyan-900/30 p-8 rounded-3xl shadow-xl shadow-cyan-900/5">
            <h2 className="text-xs font-bold text-slate-400 mb-6 uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck size={16} className="text-cyan-500" />
              Operational Controls
            </h2>
            <div className="space-y-4">
              <button 
                onClick={async () => {
                  toast.loading("Scanning markets...");
                  await fetch('/api/oracle/daily?refresh=true');
                  queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
                  toast.success("Daily picks regenerated.");
                }}
                className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black rounded-xl transition-all flex items-center justify-center gap-2 text-xs uppercase"
              >
                <RefreshCw size={16} />
                Regenerate Picks
              </button>
              
              <button 
                disabled={isProcessing}
                onClick={handleFinalize}
                className={`w-full py-4 ${isProcessing ? 'bg-slate-800' : 'bg-emerald-600 hover:bg-emerald-500'} text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 text-xs uppercase`}
              >
                {isProcessing ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                Finalize All Pending
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

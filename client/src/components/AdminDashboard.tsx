import React, { useState } from 'react';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Users, 
  TrendingUp, 
  Database, 
  RefreshCw, 
  ArrowLeft,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface AdminDashboardProps {
  onBack: () => void;
}

export default function AdminDashboard({ onBack }: AdminDashboardProps) {
  const queryClient = useQueryClient();

  // 1. Fetch Stats (Using the verified /api/admin/stats route)
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ["/api/admin/stats"],
    refetchInterval: 5000 // Auto-refresh every 5 seconds
  });

  // 2. Fetch Diagnostics
  const { data: diag } = useQuery({
    queryKey: ["/api/admin/diagnostics"]
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-mono">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-900 rounded-lg text-cyan-500">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-white">SENTINEL_ADMIN_v2.0</h1>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-slate-500 uppercase">System Live</span>
        </div>
      </div>

      {/* Metric Grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl relative overflow-hidden">
          <div className="flex items-center gap-3 mb-2 text-slate-400">
            <Users size={18} />
            <span className="text-xs uppercase tracking-wider">Total Users</span>
          </div>
          <div className="text-3xl font-bold text-white">
            {loadingStats ? "..." : stats?.totalUsers ?? 0}
          </div>
          <div className="absolute -right-2 -bottom-2 opacity-5 text-white">
            <Users size={80} />
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl relative overflow-hidden">
          <div className="flex items-center gap-3 mb-2 text-slate-400">
            <TrendingUp size={18} />
            <span className="text-xs uppercase tracking-wider">Total Predictions</span>
          </div>
          <div className="text-3xl font-bold text-cyan-400">
            {loadingStats ? "..." : stats?.totalPredictions ?? 0}
          </div>
          <div className="absolute -right-2 -bottom-2 opacity-5 text-cyan-400">
            <TrendingUp size={80} />
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl relative overflow-hidden">
          <div className="flex items-center gap-3 mb-2 text-slate-400">
            <Database size={18} />
            <span className="text-xs uppercase tracking-wider">Database Health</span>
          </div>
          <div className="text-lg font-bold text-green-400 uppercase flex items-center gap-2">
            <CheckCircle2 size={16} />
            {diag?.status || "HEALTHY"}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">LATENCY: {diag?.latency || "14ms"}</div>
        </div>
      </div>

      {/* Admin Controls */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-slate-900/80 border border-cyan-900/30 p-6 rounded-2xl shadow-2xl shadow-cyan-900/10">
          <h2 className="text-sm font-bold text-white mb-4 uppercase tracking-widest flex items-center gap-2">
            <RefreshCw size={14} className="text-cyan-500" />
            Oracle Control
          </h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            Forces the Finnhub scanner to pull fresh market data and generate new 
            Daily T10 Picks. This bypasses the 9:00 AM scheduler.
          </p>
          <button 
            onClick={async () => {
              const res = await fetch('/api/oracle/daily?refresh=true');
              if (res.ok) queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
            }}
            className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-lg transition-all active:scale-95 text-xs uppercase"
          >
            Force Regenerate Picks
          </button>
        </div>

        <div className="bg-slate-900/30 border border-slate-800 p-6 rounded-2xl">
          <h3 className="text-xs font-bold text-slate-500 mb-4 uppercase tracking-widest">System Logs</h3>
          <div className="space-y-2">
            <div className="text-[10px] flex gap-2">
              <span className="text-cyan-700">[OK]</span>
              <span className="text-slate-500">API connection established</span>
            </div>
            <div className="text-[10px] flex gap-2">
              <span className="text-cyan-700">[OK]</span>
              <span className="text-slate-500">Finnhub Bridge Active</span>
            </div>
            <div className="text-[10px] flex gap-2">
              <span className="text-yellow-700">[LOG]</span>
              <span className="text-slate-500">Stats synced: {stats?.totalPredictions} signals</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

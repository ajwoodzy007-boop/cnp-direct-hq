import { useState, useEffect } from 'react';
import { ShieldCheckIcon, UsersIcon, ArrowTrendingUpIcon, TrophyIcon, ArrowLeftIcon, SparklesIcon, ArrowPathIcon, TicketIcon, ClipboardIcon, TrashIcon, PlusIcon, BoltIcon, ChartBarIcon, CurrencyDollarIcon, ClockIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

type AdminTab = 'overview' | 'winrates' | 'portfolios' | 'activity';

interface WinRateEntry {
  id: string;
  ticker: string;
  confidence: number;
  entry_price: number;
  open_price: number;
  predicted_price: number;
  close_price: number;
  close_pnl: number;
  outcome: string;
  run_date: string;
  asset_type: string;
}

interface WinRateByDate {
  run_date: string;
  total: number;
  wins: number;
  losses: number;
  avg_pnl: number;
  winRate: string;
}

interface WinRateByTicker {
  ticker: string;
  total: number;
  wins: number;
  losses: number;
  avg_pnl: number;
  avg_confidence: number;
  winRate: string;
}

interface PortfolioPosition {
  id: string;
  user_id: string;
  user_email: string;
  ticker: string;
  shares: number;
  average_cost: number;
  current_price: number;
  added_at: string;
  total_cost: number;
  current_value: number;
}

interface PortfolioSummary {
  user_id: string;
  email: string;
  positions: number;
  total_invested: number;
  current_value: number;
  pnl: string;
  pnlPercent: string;
}

interface PlaybookActivity {
  user_id: string;
  email: string;
  playbook_type: string;
  status: string;
  generated_at: string;
}

interface AffiliateClick {
  ticker: string;
  destination: string;
  clicked_at: string;
}

interface AdminStats {
  users: {
    total: number;
    byTier: Record<string, number>;
  };
  predictions: {
    total: number;
    wins: number;
    losses: number;
    winRate: string;
  };
  recentUsers: Array<{ id: string; email: string; tier: string }>;
  recentRuns: Array<{ id: number; run_date: string; created_at: string }>;
}

interface UserRow {
  id: string;
  email: string;
  tier: string;
}

interface BetaPass {
  id: string;
  code: string;
  created_at: string;
  expires_at: string;
  redeemed_by: string | null;
  redeemed_email: string | null;
  redeemed_at: string | null;
}

interface Diagnostics {
  users: { count: number; error: string | null };
  predictions: { count: number; error: string | null };
  beta_passes: { count: number; error: string | null };
  tables: string[] | { error: string };
}

interface BusinessMetrics {
  mrr: string;
  arr: string;
  monthlyPrice: number;
  activeSubscribers: number;
  totalUsers: number;
  freeUsers: number;
  conversionRate: string;
  playbookRuns30d: number;
  playbookUniqueUsers30d: number;
  totalPredictions: number;
  predictionWins: number;
  predictionLosses: number;
  predictionWinRate: string;
  signupTrend: { date: string; signups: number }[];
}

export default function AdminDashboard({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUsers, setShowUsers] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [betaPasses, setBetaPasses] = useState<BetaPass[]>([]);
  const [generatingPass, setGeneratingPass] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [finalizingStocks, setFinalizingStocks] = useState(false);
  const [finalizingCrypto, setFinalizingCrypto] = useState(false);
  const [finalizingAll, setFinalizingAll] = useState(false);
  const [finalizeResult, setFinalizeResult] = useState<string | null>(null);
  const [regeneratingStocks, setRegeneratingStocks] = useState(false);
  const [regeneratingCrypto, setRegeneratingCrypto] = useState(false);
  const [regenerateResult, setRegenerateResult] = useState<string | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<string | null>(null);
  const [adminKey, setAdminKey] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [businessMetrics, setBusinessMetrics] = useState<BusinessMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  
  // Spreadsheet data
  const [winRateEntries, setWinRateEntries] = useState<WinRateEntry[]>([]);
  const [winRateByDate, setWinRateByDate] = useState<WinRateByDate[]>([]);
  const [winRateByTicker, setWinRateByTicker] = useState<WinRateByTicker[]>([]);
  const [portfolioPositions, setPortfolioPositions] = useState<PortfolioPosition[]>([]);
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary[]>([]);
  const [playbookActivity, setPlaybookActivity] = useState<PlaybookActivity[]>([]);
  const [affiliateClicks, setAffiliateClicks] = useState<AffiliateClick[]>([]);
  const [loadingWinRates, setLoadingWinRates] = useState(false);
  const [loadingPortfolios, setLoadingPortfolios] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [winRateView, setWinRateView] = useState<'byDate' | 'byTicker' | 'entries'>('byDate');

  // Helper for authenticated admin API calls
  const adminFetch = async (url: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };
    if (adminKey) {
      headers['X-Admin-Key'] = adminKey;
    }
    return fetch(url, { ...options, headers });
  };

  const verifyAdminKey = async () => {
    if (!adminKey) return false;
    try {
      const res = await adminFetch('/api/admin/stats');
      const json = await res.json();
      if (json.success) {
        setIsAuthenticated(true);
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/stats');
      const json = await res.json();
      if (json.success) {
        setStats(json.data);
        setIsAuthenticated(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await adminFetch('/api/admin/users');
      const json = await res.json();
      if (json.success) setUsers(json.users);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBetaPasses = async () => {
    try {
      const res = await adminFetch('/api/admin/beta-passes');
      const json = await res.json();
      if (json.success) setBetaPasses(json.passes);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBusinessMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const res = await adminFetch('/api/admin/business-metrics');
      const json = await res.json();
      if (json.success) setBusinessMetrics(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const fetchDiagnostics = async () => {
    try {
      const res = await adminFetch('/api/admin/diagnostics');
      const json = await res.json();
      if (json.success) setDiagnostics(json.diagnostics);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchWinRates = async () => {
    setLoadingWinRates(true);
    try {
      const res = await adminFetch('/api/admin/win-rates');
      const json = await res.json();
      if (json.success) {
        setWinRateEntries(json.data.entries || []);
        setWinRateByDate(json.data.byDate || []);
        setWinRateByTicker(json.data.byTicker || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingWinRates(false);
    }
  };

  const fetchPortfolios = async () => {
    setLoadingPortfolios(true);
    try {
      const res = await adminFetch('/api/admin/portfolios');
      const json = await res.json();
      if (json.success) {
        setPortfolioPositions(json.data.positions || []);
        setPortfolioSummary(json.data.userSummary || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPortfolios(false);
    }
  };

  const fetchActivity = async () => {
    setLoadingActivity(true);
    try {
      const res = await adminFetch('/api/admin/activity');
      const json = await res.json();
      if (json.success) {
        setPlaybookActivity(json.data.playbookActivity || []);
        setAffiliateClicks(json.data.affiliateClicks || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingActivity(false);
    }
  };

  const generateBetaPass = async () => {
    setGeneratingPass(true);
    try {
      const res = await adminFetch('/api/admin/beta-passes/generate', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        fetchBetaPasses();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingPass(false);
    }
  };

  const deleteBetaPass = async (id: string) => {
    try {
      await fetch(`/api/admin/beta-passes/${id}`, { method: 'DELETE' });
      setBetaPasses(betaPasses.filter(p => p.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const exportToCsv = <T extends object>(filename: string, rows: T[]) => {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]) as (keyof T)[];
    const csvContent = [
      headers.join(','),
      ...rows.map(row => headers.map(h => {
        const val = row[h];
        const str = val === null || val === undefined ? '' : String(val);
        return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const forceFinalize = async (type: 'stocks' | 'crypto') => {
    const setLoading = type === 'stocks' ? setFinalizingStocks : setFinalizingCrypto;
    const endpoint = type === 'stocks' ? '/api/admin/force-finalize' : '/api/admin/force-finalize-crypto';
    
    setLoading(true);
    setFinalizeResult(null);
    try {
      const res = await fetch(endpoint, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setFinalizeResult(`${type === 'stocks' ? 'Stocks' : 'Crypto'}: ${json.message || 'Finalized successfully'}`);
        fetchStats();
      } else {
        setFinalizeResult(`Error: ${json.error || 'Failed to finalize'}`);
      }
    } catch (e: any) {
      setFinalizeResult(`Error: ${e.message || 'Network error'}`);
    } finally {
      setLoading(false);
    }
  };

  const forceFinallizeAll = async () => {
    setFinalizingAll(true);
    setFinalizeResult(null);
    try {
      const res = await adminFetch('/api/admin/force-finalize-all', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setFinalizeResult(`ALL PENDING: ${json.message || 'Finalized successfully'}`);
        fetchStats();
      } else {
        setFinalizeResult(`Error: ${json.error || 'Failed to finalize all'}`);
      }
    } catch (e: any) {
      setFinalizeResult(`Error: ${e.message || 'Network error'}`);
    } finally {
      setFinalizingAll(false);
    }
  };

  const regeneratePicks = async (type: 'stocks' | 'crypto') => {
    const setLoading = type === 'stocks' ? setRegeneratingStocks : setRegeneratingCrypto;
    const endpoint = type === 'stocks' ? '/api/oracle/daily?refresh=true' : '/api/oracle/crypto-daily?refresh=true';
    
    setLoading(true);
    setRegenerateResult(null);
    try {
      const res = await fetch(endpoint);
      const json = await res.json();
      if (json.success) {
        const count = json.data?.length || 0;
        setRegenerateResult(`${type === 'stocks' ? 'Stocks' : 'Crypto'}: Generated ${count} new picks`);
        fetchStats();
      } else {
        setRegenerateResult(`Error: ${json.error || 'Failed to generate picks'}`);
      }
    } catch (e: any) {
      setRegenerateResult(`Error: ${e.message || 'Network error'}`);
    } finally {
      setLoading(false);
    }
  };

  const backfillPredictions = async () => {
    setBackfilling(true);
    setBackfillResult(null);
    try {
      const res = await adminFetch('/api/admin/backfill-predictions', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: 14 })
      });
      const json = await res.json();
      if (json.success) {
        const summary = json.results?.map((r: any) => `${r.date}: ${r.action}${r.count ? ` (${r.count})` : ''}`).join(', ') || json.message;
        setBackfillResult(`Backfill complete: ${summary}`);
        fetchStats();
      } else {
        setBackfillResult(`Error: ${json.error || 'Failed to backfill'}`);
      }
    } catch (e: any) {
      setBackfillResult(`Error: ${e.message || 'Network error'}`);
    } finally {
      setBackfilling(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchBetaPasses();
    fetchBusinessMetrics();
  }, []);

  useEffect(() => {
    if (activeTab === 'winrates' && winRateByDate.length === 0) {
      fetchWinRates();
    } else if (activeTab === 'portfolios' && portfolioSummary.length === 0) {
      fetchPortfolios();
    } else if (activeTab === 'activity' && playbookActivity.length === 0) {
      fetchActivity();
    }
  }, [activeTab]);

  const handleToggleTier = async (userId: string, currentTier: string) => {
    const newTier = currentTier === 'PREMIUM' ? 'FREE' : 'PREMIUM';
    setUpdating(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/tier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: newTier })
      });
      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, tier: newTier } : u));
        fetchStats();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(null);
    }
  };

  const handleShowUsers = () => {
    setShowUsers(true);
    fetchUsers();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-cyan-400 animate-pulse">Loading admin data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              data-testid="button-admin-back"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center">
                <ShieldCheckIcon className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
                <p className="text-sm text-slate-500">Sentinel Command Center</p>
              </div>
            </div>
          </div>
          <button 
            onClick={fetchStats}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-cyan-400 transition-colors"
            data-testid="button-refresh-stats"
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Admin Authentication */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-xs text-slate-500 mb-1 block">Admin Password (for live site)</label>
              <input
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="Enter ADMIN_PASSWORD to unlock controls on production"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                data-testid="input-admin-key"
              />
            </div>
            <button
              onClick={async () => {
                const success = await verifyAdminKey();
                if (success) {
                  setFinalizeResult('Admin key verified!');
                } else {
                  setFinalizeResult('Invalid admin key');
                }
              }}
              className="px-4 py-2 bg-cyan-600/30 hover:bg-cyan-600/40 text-cyan-300 rounded-lg border border-cyan-400/50 transition-all mt-5"
              data-testid="button-verify-admin"
            >
              Verify
            </button>
            {isAuthenticated && (
              <div className="flex items-center gap-2 text-green-400 mt-5">
                <ShieldCheckIcon className="h-5 w-5" />
                <span className="text-sm">Authenticated</span>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-t-lg flex items-center gap-2 text-sm font-medium transition-colors ${
              activeTab === 'overview' 
                ? 'bg-slate-800 text-cyan-400 border-b-2 border-cyan-400' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
            data-testid="tab-overview"
          >
            <ShieldCheckIcon className="h-4 w-4" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('winrates')}
            className={`px-4 py-2 rounded-t-lg flex items-center gap-2 text-sm font-medium transition-colors ${
              activeTab === 'winrates' 
                ? 'bg-slate-800 text-green-400 border-b-2 border-green-400' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
            data-testid="tab-winrates"
          >
            <ChartBarIcon className="h-4 w-4" />
            All Predictions
          </button>
          <button
            onClick={() => setActiveTab('portfolios')}
            className={`px-4 py-2 rounded-t-lg flex items-center gap-2 text-sm font-medium transition-colors ${
              activeTab === 'portfolios' 
                ? 'bg-slate-800 text-amber-400 border-b-2 border-amber-400' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
            data-testid="tab-portfolios"
          >
            <CurrencyDollarIcon className="h-4 w-4" />
            User Portfolios
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-4 py-2 rounded-t-lg flex items-center gap-2 text-sm font-medium transition-colors ${
              activeTab === 'activity' 
                ? 'bg-slate-800 text-purple-400 border-b-2 border-purple-400' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
            data-testid="tab-activity"
          >
            <ClockIcon className="h-4 w-4" />
            User Activity
          </button>
        </div>

        {activeTab === 'overview' && (
        <>
        {/* Executive Summary - Business Metrics */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-cyan-500/30 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <ChartBarIcon className="h-5 w-5 text-cyan-400" />
              Executive Summary
            </h3>
            <button
              onClick={() => {
                if (businessMetrics) {
                  const { signupTrend, ...flatMetrics } = businessMetrics;
                  const report = {
                    generatedAt: new Date().toISOString(),
                    ...flatMetrics,
                    signups_last_30_days: signupTrend?.reduce((sum, d) => sum + Number(d.signups), 0) || 0
                  };
                  exportToCsv(`business_report_${new Date().toISOString().split('T')[0]}.csv`, [report]);
                }
              }}
              className="px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 rounded text-sm flex items-center gap-2 border border-cyan-500/30"
              data-testid="btn-download-report"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              Export Report
            </button>
          </div>
          {loadingMetrics ? (
            <div className="text-cyan-400 animate-pulse">Loading metrics...</div>
          ) : businessMetrics ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="text-slate-400 text-xs mb-1">MRR</div>
                <div className="text-2xl font-bold text-green-400">${businessMetrics.mrr}</div>
                <div className="text-xs text-slate-500">Monthly Recurring</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="text-slate-400 text-xs mb-1">ARR</div>
                <div className="text-2xl font-bold text-green-400">${businessMetrics.arr}</div>
                <div className="text-xs text-slate-500">Annual Recurring</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="text-slate-400 text-xs mb-1">Active Subscribers</div>
                <div className="text-2xl font-bold text-amber-400">{businessMetrics.activeSubscribers}</div>
                <div className="text-xs text-slate-500">@ ${businessMetrics.monthlyPrice}/mo</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="text-slate-400 text-xs mb-1">Conversion Rate</div>
                <div className="text-2xl font-bold text-cyan-400">{businessMetrics.conversionRate}%</div>
                <div className="text-xs text-slate-500">Free → Premium</div>
              </div>
            </div>
          ) : (
            <div className="text-slate-500">No metrics available</div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <UsersIcon className="h-5 w-5 text-cyan-400" />
              <span className="text-slate-400 text-sm">Total Users</span>
            </div>
            <div className="text-3xl font-bold text-white">{stats?.users.total || 0}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <SparklesIcon className="h-5 w-5 text-amber-400" />
              <span className="text-slate-400 text-sm">Premium Users</span>
            </div>
            <div className="text-3xl font-bold text-amber-400">{stats?.users.byTier?.PREMIUM || 0}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <ArrowTrendingUpIcon className="h-5 w-5 text-green-400" />
              <span className="text-slate-400 text-sm">Total Predictions</span>
            </div>
            <div className="text-3xl font-bold text-white">{stats?.predictions.total || 0}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <TrophyIcon className="h-5 w-5 text-green-400" />
              <span className="text-slate-400 text-sm">Win Rate</span>
            </div>
            <div className="text-3xl font-bold text-green-400">{stats?.predictions.winRate || 0}%</div>
            <div className="text-xs text-slate-500 mt-1">
              {stats?.predictions.wins || 0}W / {stats?.predictions.losses || 0}L
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Recent Sign-ups</h3>
              <button 
                onClick={handleShowUsers}
                className="text-sm text-cyan-400 hover:text-cyan-300"
                data-testid="button-view-all-users"
              >
                View All
              </button>
            </div>
            <div className="space-y-3">
              {stats?.recentUsers?.map(user => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <div className="text-white text-sm">{user.email}</div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    user.tier === 'PREMIUM' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-400'
                  }`}>
                    {user.tier}
                  </span>
                </div>
              ))}
              {(!stats?.recentUsers || stats.recentUsers.length === 0) && (
                <div className="text-slate-500 text-sm text-center py-4">No users yet</div>
              )}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Prediction Runs</h3>
            <div className="space-y-3">
              {stats?.recentRuns?.map(run => (
                <div key={run.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <div className="text-white text-sm">Daily Top 10</div>
                  <div className="text-slate-400 text-sm">{run.run_date}</div>
                </div>
              ))}
              {(!stats?.recentRuns || stats.recentRuns.length === 0) && (
                <div className="text-slate-500 text-sm text-center py-4">No prediction runs yet</div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <TicketIcon className="h-5 w-5 text-purple-400" /> Beta Passes (7-Day Trial)
            </h3>
            <button 
              onClick={generateBetaPass}
              disabled={generatingPass}
              className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 text-sm rounded-lg flex items-center gap-1.5 transition-all border border-purple-500/30 disabled:opacity-50"
              data-testid="button-generate-pass"
            >
              <PlusIcon className="h-4 w-4" />
              {generatingPass ? 'Generating...' : 'Generate Pass'}
            </button>
          </div>
          <div className="space-y-3">
            {betaPasses.map(pass => (
              <div key={pass.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <code className="bg-slate-950 px-3 py-1.5 rounded text-purple-400 font-mono text-sm">
                    {pass.code}
                  </code>
                  <button
                    onClick={() => copyCode(pass.code)}
                    className="text-slate-500 hover:text-cyan-400 transition-colors"
                    title="Copy code"
                  >
                    <ClipboardIcon className="h-4 w-4" />
                  </button>
                  {copiedCode === pass.code && (
                    <span className="text-xs text-green-400">Copied!</span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  {pass.redeemed_by ? (
                    <div className="text-right">
                      <div className="text-xs text-green-400">Redeemed</div>
                      <div className="text-xs text-slate-500">{pass.redeemed_email}</div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500">Available</div>
                  )}
                  {!pass.redeemed_by && (
                    <button
                      onClick={() => deleteBetaPass(pass.id)}
                      className="text-slate-500 hover:text-red-400 transition-colors"
                      title="Delete pass"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {betaPasses.length === 0 && (
              <div className="text-slate-500 text-sm text-center py-4">
                No beta passes yet. Click "Generate Pass" to create one.
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-900 border border-green-800/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <ArrowPathIcon className="h-5 w-5 text-green-400" /> Regenerate Daily Picks
            </h3>
          </div>
          <p className="text-sm text-slate-400 mb-4">
            Manually trigger the Oracle to generate new predictions for today. This will <strong className="text-green-400">replace existing picks</strong> for the current day.
          </p>
          <div className="flex gap-3 flex-wrap mb-4">
            <button
              onClick={() => regeneratePicks('stocks')}
              disabled={regeneratingStocks}
              className="px-4 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 rounded-lg flex items-center gap-2 border border-cyan-500/30 disabled:opacity-50 transition-all"
              data-testid="button-regenerate-stocks"
            >
              <ArrowPathIcon className={`h-4 w-4 ${regeneratingStocks ? 'animate-spin' : ''}`} />
              {regeneratingStocks ? 'Generating Stocks...' : 'Generate Stock Picks'}
            </button>
            <button
              onClick={() => regeneratePicks('crypto')}
              disabled={regeneratingCrypto}
              className="px-4 py-2 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 rounded-lg flex items-center gap-2 border border-orange-500/30 disabled:opacity-50 transition-all"
              data-testid="button-regenerate-crypto"
            >
              <ArrowPathIcon className={`h-4 w-4 ${regeneratingCrypto ? 'animate-spin' : ''}`} />
              {regeneratingCrypto ? 'Generating Crypto...' : 'Generate Crypto Picks'}
            </button>
          </div>
          <p className="text-sm text-slate-400 mb-3">After generating picks, finalize them to record outcomes:</p>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => forceFinalize('stocks')}
              disabled={finalizingStocks}
              className="px-4 py-2 bg-cyan-600/30 hover:bg-cyan-600/40 text-cyan-300 rounded-lg flex items-center gap-2 border border-cyan-400/50 disabled:opacity-50 transition-all"
              data-testid="button-finalize-stocks-quick"
            >
              <BoltIcon className="h-4 w-4" />
              {finalizingStocks ? 'Finalizing...' : 'Finalize Stocks'}
            </button>
            <button
              onClick={() => forceFinalize('crypto')}
              disabled={finalizingCrypto}
              className="px-4 py-2 bg-orange-600/30 hover:bg-orange-600/40 text-orange-300 rounded-lg flex items-center gap-2 border border-orange-400/50 disabled:opacity-50 transition-all"
              data-testid="button-finalize-crypto-quick"
            >
              <BoltIcon className="h-4 w-4" />
              {finalizingCrypto ? 'Finalizing...' : 'Finalize Crypto'}
            </button>
            <button
              onClick={forceFinallizeAll}
              disabled={finalizingAll}
              className="px-4 py-2 bg-red-600/30 hover:bg-red-600/40 text-red-300 rounded-lg flex items-center gap-2 border border-red-400/50 disabled:opacity-50 transition-all font-semibold"
              data-testid="button-finalize-all-quick"
            >
              <BoltIcon className="h-4 w-4" />
              {finalizingAll ? 'Finalizing All...' : 'FINALIZE ALL'}
            </button>
          </div>
          <p className="text-sm text-slate-400 mt-4 mb-3">Backfill predictions for past 14 trading days:</p>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={backfillPredictions}
              disabled={backfilling}
              className="px-4 py-2 bg-purple-600/30 hover:bg-purple-600/40 text-purple-300 rounded-lg flex items-center gap-2 border border-purple-400/50 disabled:opacity-50 transition-all font-semibold"
              data-testid="button-backfill-predictions"
            >
              <ClockIcon className="h-4 w-4" />
              {backfilling ? 'Backfilling...' : 'BACKFILL PAST 14 DAYS'}
            </button>
          </div>
          {backfillResult && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${
              backfillResult.startsWith('Error') 
                ? 'bg-red-900/30 text-red-400 border border-red-500/30' 
                : 'bg-green-900/30 text-green-400 border border-green-500/30'
            }`}>
              {backfillResult}
            </div>
          )}
          {regenerateResult && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${
              regenerateResult.startsWith('Error') 
                ? 'bg-red-900/30 text-red-400 border border-red-500/30' 
                : 'bg-green-900/30 text-green-400 border border-green-500/30'
            }`}>
              {regenerateResult}
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-red-800/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <BoltIcon className="h-5 w-5 text-red-400" /> Force Finalize Predictions
            </h3>
          </div>
          <p className="text-sm text-slate-400 mb-4">
            Manually finalize predictions with closing prices. Use <strong className="text-red-400">FINALIZE ALL PENDING</strong> to process ALL unfilled predictions from any date.
          </p>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => forceFinalize('stocks')}
              disabled={finalizingStocks}
              className="px-4 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 rounded-lg flex items-center gap-2 border border-cyan-500/30 disabled:opacity-50 transition-all"
              data-testid="button-force-finalize-stocks"
            >
              <BoltIcon className="h-4 w-4" />
              {finalizingStocks ? 'Finalizing Stocks...' : 'Finalize Stocks'}
            </button>
            <button
              onClick={() => forceFinalize('crypto')}
              disabled={finalizingCrypto}
              className="px-4 py-2 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 rounded-lg flex items-center gap-2 border border-orange-500/30 disabled:opacity-50 transition-all"
              data-testid="button-force-finalize-crypto"
            >
              <BoltIcon className="h-4 w-4" />
              {finalizingCrypto ? 'Finalizing Crypto...' : 'Finalize Crypto'}
            </button>
            <button
              onClick={forceFinallizeAll}
              disabled={finalizingAll}
              className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg flex items-center gap-2 border border-red-500/30 disabled:opacity-50 transition-all font-semibold"
              data-testid="button-force-finalize-all"
            >
              <BoltIcon className="h-4 w-4" />
              {finalizingAll ? 'Finalizing All...' : 'FINALIZE ALL PENDING'}
            </button>
          </div>
          {finalizeResult && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${
              finalizeResult.startsWith('Error') 
                ? 'bg-red-900/30 text-red-400 border border-red-500/30' 
                : 'bg-green-900/30 text-green-400 border border-green-500/30'
            }`}>
              {finalizeResult}
            </div>
          )}
        </div>

        {showUsers && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">All Users</h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => exportToCsv(`users_${new Date().toISOString().split('T')[0]}.csv`, users)}
                  className="px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 rounded text-sm flex items-center gap-2 border border-cyan-500/30"
                  data-testid="btn-download-users"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  Download CSV
                </button>
                <button 
                  onClick={() => setShowUsers(false)}
                  className="text-sm text-slate-400 hover:text-white px-3 py-1.5"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left py-3 px-4 text-slate-400 text-sm font-medium">Email</th>
                    <th className="text-left py-3 px-4 text-slate-400 text-sm font-medium">Tier</th>
                    <th className="text-right py-3 px-4 text-slate-400 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="py-3 px-4 text-white text-sm">{user.email}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          user.tier === 'PREMIUM' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-400'
                        }`}>
                          {user.tier}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleToggleTier(user.id, user.tier)}
                          disabled={updating === user.id}
                          className={`text-xs px-3 py-1.5 rounded transition-colors ${
                            user.tier === 'PREMIUM' 
                              ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' 
                              : 'bg-amber-600/20 hover:bg-amber-600/30 text-amber-400'
                          } disabled:opacity-50`}
                          data-testid={`button-toggle-tier-${user.id}`}
                        >
                          {updating === user.id ? '...' : user.tier === 'PREMIUM' ? 'Downgrade' : 'Upgrade'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Database Diagnostics</h3>
            <button 
              onClick={() => { setShowDiagnostics(!showDiagnostics); if (!diagnostics) fetchDiagnostics(); }}
              className="text-sm text-cyan-400 hover:text-cyan-300"
              data-testid="button-toggle-diagnostics"
            >
              {showDiagnostics ? 'Hide' : 'Run Diagnostics'}
            </button>
          </div>
          {showDiagnostics && (
            <div className="space-y-3">
              {diagnostics ? (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-xs text-slate-400">Users Table</div>
                      <div className="text-xl font-bold text-white">{diagnostics.users.count}</div>
                      {diagnostics.users.error && <div className="text-xs text-red-400">{diagnostics.users.error}</div>}
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-xs text-slate-400">Predictions Table</div>
                      <div className="text-xl font-bold text-white">{diagnostics.predictions.count}</div>
                      {diagnostics.predictions.error && <div className="text-xs text-red-400">{diagnostics.predictions.error}</div>}
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-xs text-slate-400">Beta Passes Table</div>
                      <div className="text-xl font-bold text-white">{diagnostics.beta_passes.count}</div>
                      {diagnostics.beta_passes.error && <div className="text-xs text-red-400">{diagnostics.beta_passes.error}</div>}
                    </div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="text-xs text-slate-400 mb-2">All Database Tables</div>
                    <div className="text-sm text-white font-mono">
                      {Array.isArray(diagnostics.tables) ? diagnostics.tables.join(', ') : 'Error loading tables'}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-slate-500 text-sm text-center py-4">Loading diagnostics...</div>
              )}
            </div>
          )}
        </div>
        </>
        )}

        {/* WIN RATES TAB */}
        {activeTab === 'winrates' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => setWinRateView('byDate')}
                  className={`px-3 py-1.5 rounded text-sm ${winRateView === 'byDate' ? 'bg-green-600/20 text-green-400 border border-green-500/30' : 'bg-slate-800 text-slate-400'}`}
                  data-testid="btn-winrate-bydate"
                >
                  By Date
                </button>
                <button
                  onClick={() => setWinRateView('byTicker')}
                  className={`px-3 py-1.5 rounded text-sm ${winRateView === 'byTicker' ? 'bg-green-600/20 text-green-400 border border-green-500/30' : 'bg-slate-800 text-slate-400'}`}
                  data-testid="btn-winrate-byticker"
                >
                  By Ticker
                </button>
                <button
                  onClick={() => setWinRateView('entries')}
                  className={`px-3 py-1.5 rounded text-sm ${winRateView === 'entries' ? 'bg-green-600/20 text-green-400 border border-green-500/30' : 'bg-slate-800 text-slate-400'}`}
                  data-testid="btn-winrate-entries"
                >
                  All Entries
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const data = winRateView === 'byDate' ? winRateByDate : winRateView === 'byTicker' ? winRateByTicker : winRateEntries;
                    if (data.length === 0) {
                      alert('No data to export. Please wait for data to load.');
                      return;
                    }
                    exportToCsv(`predictions_${winRateView}_${new Date().toISOString().split('T')[0]}.csv`, data as object[]);
                  }}
                  disabled={loadingWinRates || (winRateView === 'byDate' ? winRateByDate.length === 0 : winRateView === 'byTicker' ? winRateByTicker.length === 0 : winRateEntries.length === 0)}
                  className="px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded text-sm flex items-center gap-2 border border-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="btn-download-predictions"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  Download CSV
                </button>
                <button
                  onClick={fetchWinRates}
                  disabled={loadingWinRates}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-green-400 rounded text-sm flex items-center gap-2"
                  data-testid="btn-refresh-winrates"
                >
                  <ArrowPathIcon className={`h-4 w-4 ${loadingWinRates ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            {loadingWinRates ? (
              <div className="text-center py-12 text-green-400 animate-pulse">Loading win rate data...</div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-slate-900">
                      {winRateView === 'byDate' && (
                        <tr className="border-b border-slate-800">
                          <th className="text-left py-3 px-4 text-slate-400 text-sm font-medium">Date</th>
                          <th className="text-right py-3 px-4 text-slate-400 text-sm font-medium">Total</th>
                          <th className="text-right py-3 px-4 text-slate-400 text-sm font-medium">Wins</th>
                          <th className="text-right py-3 px-4 text-slate-400 text-sm font-medium">Losses</th>
                          <th className="text-right py-3 px-4 text-slate-400 text-sm font-medium">Win Rate</th>
                          <th className="text-right py-3 px-4 text-slate-400 text-sm font-medium">Avg P&L</th>
                        </tr>
                      )}
                      {winRateView === 'byTicker' && (
                        <tr className="border-b border-slate-800">
                          <th className="text-left py-3 px-4 text-slate-400 text-sm font-medium">Ticker</th>
                          <th className="text-right py-3 px-4 text-slate-400 text-sm font-medium">Total</th>
                          <th className="text-right py-3 px-4 text-slate-400 text-sm font-medium">Wins</th>
                          <th className="text-right py-3 px-4 text-slate-400 text-sm font-medium">Losses</th>
                          <th className="text-right py-3 px-4 text-slate-400 text-sm font-medium">Win Rate</th>
                          <th className="text-right py-3 px-4 text-slate-400 text-sm font-medium">Avg Conf</th>
                          <th className="text-right py-3 px-4 text-slate-400 text-sm font-medium">Avg P&L</th>
                        </tr>
                      )}
                      {winRateView === 'entries' && (
                        <tr className="border-b border-slate-800">
                          <th className="text-left py-3 px-4 text-slate-400 text-sm font-medium">Date</th>
                          <th className="text-left py-3 px-4 text-slate-400 text-sm font-medium">Ticker</th>
                          <th className="text-left py-3 px-4 text-slate-400 text-sm font-medium">Type</th>
                          <th className="text-right py-3 px-4 text-slate-400 text-sm font-medium">Conf</th>
                          <th className="text-right py-3 px-4 text-slate-400 text-sm font-medium">Entry</th>
                          <th className="text-right py-3 px-4 text-slate-400 text-sm font-medium">Target</th>
                          <th className="text-right py-3 px-4 text-slate-400 text-sm font-medium">Close</th>
                          <th className="text-right py-3 px-4 text-slate-400 text-sm font-medium">P&L</th>
                          <th className="text-center py-3 px-4 text-slate-400 text-sm font-medium">Outcome</th>
                        </tr>
                      )}
                    </thead>
                    <tbody>
                      {winRateView === 'byDate' && winRateByDate.map((row, idx) => (
                        <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                          <td className="py-3 px-4 text-white text-sm font-mono">{row.run_date}</td>
                          <td className="py-3 px-4 text-right text-white text-sm">{row.total}</td>
                          <td className="py-3 px-4 text-right text-green-400 text-sm">{row.wins}</td>
                          <td className="py-3 px-4 text-right text-red-400 text-sm">{row.losses}</td>
                          <td className="py-3 px-4 text-right text-sm">
                            <span className={`font-bold ${parseFloat(row.winRate) >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                              {row.winRate}%
                            </span>
                          </td>
                          <td className={`py-3 px-4 text-right text-sm ${row.avg_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {row.avg_pnl?.toFixed(2) || '0.00'}%
                          </td>
                        </tr>
                      ))}
                      {winRateView === 'byTicker' && winRateByTicker.map((row, idx) => (
                        <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                          <td className="py-3 px-4 text-cyan-400 text-sm font-bold">{row.ticker}</td>
                          <td className="py-3 px-4 text-right text-white text-sm">{row.total}</td>
                          <td className="py-3 px-4 text-right text-green-400 text-sm">{row.wins}</td>
                          <td className="py-3 px-4 text-right text-red-400 text-sm">{row.losses}</td>
                          <td className="py-3 px-4 text-right text-sm">
                            <span className={`font-bold ${parseFloat(row.winRate) >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                              {row.winRate}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-slate-300 text-sm">{row.avg_confidence?.toFixed(0) || '-'}%</td>
                          <td className={`py-3 px-4 text-right text-sm ${row.avg_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {row.avg_pnl?.toFixed(2) || '0.00'}%
                          </td>
                        </tr>
                      ))}
                      {winRateView === 'entries' && winRateEntries.map((row, idx) => (
                        <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                          <td className="py-3 px-4 text-slate-400 text-sm font-mono">{row.run_date}</td>
                          <td className="py-3 px-4 text-cyan-400 text-sm font-bold">{row.ticker}</td>
                          <td className="py-3 px-4 text-sm">
                            <span className={`px-2 py-0.5 rounded text-xs ${row.asset_type === 'crypto' ? 'bg-orange-500/20 text-orange-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                              {row.asset_type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-slate-300 text-sm">{row.confidence?.toFixed(0)}%</td>
                          <td className="py-3 px-4 text-right text-white text-sm">${row.entry_price?.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right text-slate-400 text-sm">${row.predicted_price?.toFixed(2) || '-'}</td>
                          <td className="py-3 px-4 text-right text-white text-sm">${row.close_price?.toFixed(2) || '-'}</td>
                          <td className={`py-3 px-4 text-right text-sm font-bold ${row.close_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {row.close_pnl?.toFixed(2) || '0.00'}%
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              row.outcome?.toLowerCase() === 'win' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {row.outcome?.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {((winRateView === 'byDate' && winRateByDate.length === 0) ||
                    (winRateView === 'byTicker' && winRateByTicker.length === 0) ||
                    (winRateView === 'entries' && winRateEntries.length === 0)) && (
                    <div className="text-center py-12 text-slate-500">No win rate data available</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PORTFOLIOS TAB */}
        {activeTab === 'portfolios' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <CurrencyDollarIcon className="h-5 w-5 text-amber-400" />
                User Vault Portfolios
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (portfolioSummary.length === 0) {
                      alert('No portfolio data to export. Please wait for data to load.');
                      return;
                    }
                    exportToCsv(`user_portfolios_${new Date().toISOString().split('T')[0]}.csv`, portfolioSummary);
                  }}
                  disabled={loadingPortfolios || portfolioSummary.length === 0}
                  className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 rounded text-sm flex items-center gap-2 border border-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="btn-download-portfolios"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  Download CSV
                </button>
                <button
                  onClick={fetchPortfolios}
                  disabled={loadingPortfolios}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-400 rounded text-sm flex items-center gap-2"
                  data-testid="btn-refresh-portfolios"
                >
                  <ArrowPathIcon className={`h-4 w-4 ${loadingPortfolios ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            {loadingPortfolios ? (
              <div className="text-center py-12 text-amber-400 animate-pulse">Loading portfolio data...</div>
            ) : (
              <>
                {/* User Summary */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <h4 className="text-md font-semibold text-white mb-4">Portfolio Summary by User</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-800">
                          <th className="text-left py-3 px-4 text-slate-400 text-sm font-medium">User</th>
                          <th className="text-right py-3 px-4 text-slate-400 text-sm font-medium">Positions</th>
                          <th className="text-right py-3 px-4 text-slate-400 text-sm font-medium">Total Invested</th>
                          <th className="text-right py-3 px-4 text-slate-400 text-sm font-medium">Current Value</th>
                          <th className="text-right py-3 px-4 text-slate-400 text-sm font-medium">P&L</th>
                          <th className="text-right py-3 px-4 text-slate-400 text-sm font-medium">P&L %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {portfolioSummary.map((row, idx) => (
                          <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                            <td className="py-3 px-4 text-white text-sm">{row.email}</td>
                            <td className="py-3 px-4 text-right text-slate-300 text-sm">{row.positions}</td>
                            <td className="py-3 px-4 text-right text-white text-sm">${row.total_invested?.toLocaleString() || '0'}</td>
                            <td className="py-3 px-4 text-right text-white text-sm">${row.current_value?.toLocaleString() || '0'}</td>
                            <td className={`py-3 px-4 text-right text-sm font-bold ${parseFloat(row.pnl) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              ${row.pnl}
                            </td>
                            <td className={`py-3 px-4 text-right text-sm font-bold ${parseFloat(row.pnlPercent) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {row.pnlPercent}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {portfolioSummary.length === 0 && (
                      <div className="text-center py-8 text-slate-500">No user portfolios found</div>
                    )}
                  </div>
                </div>

                {/* All Positions */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <h4 className="text-md font-semibold text-white mb-4">All Portfolio Positions</h4>
                  <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-slate-900">
                        <tr className="border-b border-slate-800">
                          <th className="text-left py-3 px-4 text-slate-400 text-sm font-medium">User</th>
                          <th className="text-left py-3 px-4 text-slate-400 text-sm font-medium">Ticker</th>
                          <th className="text-right py-3 px-4 text-slate-400 text-sm font-medium">Shares</th>
                          <th className="text-right py-3 px-4 text-slate-400 text-sm font-medium">Avg Cost</th>
                          <th className="text-right py-3 px-4 text-slate-400 text-sm font-medium">Current</th>
                          <th className="text-right py-3 px-4 text-slate-400 text-sm font-medium">Total Cost</th>
                          <th className="text-right py-3 px-4 text-slate-400 text-sm font-medium">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {portfolioPositions.map((row, idx) => (
                          <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                            <td className="py-3 px-4 text-white text-sm">{row.user_email || '-'}</td>
                            <td className="py-3 px-4 text-cyan-400 text-sm font-bold">{row.ticker}</td>
                            <td className="py-3 px-4 text-right text-slate-300 text-sm">{row.shares?.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right text-white text-sm">${row.average_cost?.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right text-white text-sm">${row.current_price?.toFixed(2) || '-'}</td>
                            <td className="py-3 px-4 text-right text-slate-400 text-sm">${row.total_cost?.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right text-amber-400 text-sm font-bold">${row.current_value?.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {portfolioPositions.length === 0 && (
                      <div className="text-center py-8 text-slate-500">No positions found</div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ACTIVITY TAB */}
        {activeTab === 'activity' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <ClockIcon className="h-5 w-5 text-purple-400" />
                User Activity Tracking
              </h3>
              <button
                onClick={fetchActivity}
                disabled={loadingActivity}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-purple-400 rounded text-sm flex items-center gap-2"
                data-testid="btn-refresh-activity"
              >
                <ArrowPathIcon className={`h-4 w-4 ${loadingActivity ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {loadingActivity ? (
              <div className="text-center py-12 text-purple-400 animate-pulse">Loading activity data...</div>
            ) : (
              <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* AI Playbook Usage */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <h4 className="text-md font-semibold text-white mb-4 flex items-center gap-2">
                    <SparklesIcon className="h-4 w-4 text-purple-400" />
                    AI Playbook Usage (Recent 100)
                  </h4>
                  <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-slate-900">
                        <tr className="border-b border-slate-800">
                          <th className="text-left py-2 px-3 text-slate-400 text-xs font-medium">User</th>
                          <th className="text-left py-2 px-3 text-slate-400 text-xs font-medium">Feature</th>
                          <th className="text-left py-2 px-3 text-slate-400 text-xs font-medium">Status</th>
                          <th className="text-left py-2 px-3 text-slate-400 text-xs font-medium">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {playbookActivity.map((row, idx) => (
                          <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                            <td className="py-2 px-3 text-white text-xs">{row.email || 'Demo'}</td>
                            <td className="py-2 px-3 text-purple-400 text-xs font-medium">{row.playbook_type}</td>
                            <td className="py-2 px-3">
                              <span className={`px-1.5 py-0.5 rounded text-xs ${
                                row.status === 'completed' ? 'bg-green-500/20 text-green-400' : 
                                row.status === 'failed' ? 'bg-red-500/20 text-red-400' : 
                                'bg-yellow-500/20 text-yellow-400'
                              }`}>
                                {row.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-400 text-xs">{new Date(row.generated_at).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {playbookActivity.length === 0 && (
                      <div className="text-center py-8 text-slate-500">No playbook activity found</div>
                    )}
                  </div>
                </div>

                {/* Affiliate Clicks */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <h4 className="text-md font-semibold text-white mb-4 flex items-center gap-2">
                    <ArrowTrendingUpIcon className="h-4 w-4 text-cyan-400" />
                    Affiliate Clicks (Recent 100)
                  </h4>
                  <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-slate-900">
                        <tr className="border-b border-slate-800">
                          <th className="text-left py-2 px-3 text-slate-400 text-xs font-medium">Ticker</th>
                          <th className="text-left py-2 px-3 text-slate-400 text-xs font-medium">Destination</th>
                          <th className="text-left py-2 px-3 text-slate-400 text-xs font-medium">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {affiliateClicks.map((row, idx) => (
                          <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                            <td className="py-2 px-3 text-cyan-400 text-xs font-bold">{row.ticker}</td>
                            <td className="py-2 px-3 text-white text-xs">{row.destination}</td>
                            <td className="py-2 px-3 text-slate-400 text-xs">{new Date(row.clicked_at).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {affiliateClicks.length === 0 && (
                      <div className="text-center py-8 text-slate-500">No affiliate clicks found</div>
                    )}
                  </div>
                </div>
              </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

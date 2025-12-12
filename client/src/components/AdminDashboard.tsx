import { useState, useEffect } from 'react';
import { Shield, Users, TrendingUp, Award, ArrowLeft, Crown, RefreshCw, Ticket, Copy, Trash2, Plus, Zap } from 'lucide-react';

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

export default function AdminDashboard({ onBack }: { onBack: () => void }) {
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

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/stats');
      const json = await res.json();
      if (json.success) setStats(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const json = await res.json();
      if (json.success) setUsers(json.users);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBetaPasses = async () => {
    try {
      const res = await fetch('/api/admin/beta-passes');
      const json = await res.json();
      if (json.success) setBetaPasses(json.passes);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDiagnostics = async () => {
    try {
      const res = await fetch('/api/admin/diagnostics');
      const json = await res.json();
      if (json.success) setDiagnostics(json.diagnostics);
    } catch (e) {
      console.error(e);
    }
  };

  const generateBetaPass = async () => {
    setGeneratingPass(true);
    try {
      const res = await fetch('/api/admin/beta-passes/generate', { method: 'POST' });
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
      const res = await fetch('/api/admin/force-finalize-all', { method: 'POST' });
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

  useEffect(() => {
    fetchStats();
    fetchBetaPasses();
  }, []);

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
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center">
                <Shield className="h-6 w-6 text-red-400" />
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
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-5 w-5 text-cyan-400" />
              <span className="text-slate-400 text-sm">Total Users</span>
            </div>
            <div className="text-3xl font-bold text-white">{stats?.users.total || 0}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Crown className="h-5 w-5 text-amber-400" />
              <span className="text-slate-400 text-sm">Premium Users</span>
            </div>
            <div className="text-3xl font-bold text-amber-400">{stats?.users.byTier?.PREMIUM || 0}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="h-5 w-5 text-green-400" />
              <span className="text-slate-400 text-sm">Total Predictions</span>
            </div>
            <div className="text-3xl font-bold text-white">{stats?.predictions.total || 0}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Award className="h-5 w-5 text-green-400" />
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
              <Ticket className="h-5 w-5 text-purple-400" /> Beta Passes (7-Day Trial)
            </h3>
            <button 
              onClick={generateBetaPass}
              disabled={generatingPass}
              className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 text-sm rounded-lg flex items-center gap-1.5 transition-all border border-purple-500/30 disabled:opacity-50"
              data-testid="button-generate-pass"
            >
              <Plus className="h-4 w-4" />
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
                    <Copy className="h-4 w-4" />
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
                      <Trash2 className="h-4 w-4" />
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

        {/* Force Finalize Section */}
        <div className="bg-slate-900 border border-red-800/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-red-400" /> Force Finalize Predictions
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
              <Zap className="h-4 w-4" />
              {finalizingStocks ? 'Finalizing Stocks...' : 'Finalize Stocks'}
            </button>
            <button
              onClick={() => forceFinalize('crypto')}
              disabled={finalizingCrypto}
              className="px-4 py-2 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 rounded-lg flex items-center gap-2 border border-orange-500/30 disabled:opacity-50 transition-all"
              data-testid="button-force-finalize-crypto"
            >
              <Zap className="h-4 w-4" />
              {finalizingCrypto ? 'Finalizing Crypto...' : 'Finalize Crypto'}
            </button>
            <button
              onClick={forceFinallizeAll}
              disabled={finalizingAll}
              className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg flex items-center gap-2 border border-red-500/30 disabled:opacity-50 transition-all font-semibold"
              data-testid="button-force-finalize-all"
            >
              <Zap className="h-4 w-4" />
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
              <button 
                onClick={() => setShowUsers(false)}
                className="text-sm text-slate-400 hover:text-white"
              >
                Close
              </button>
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

        {/* Diagnostics Section */}
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

      </div>
    </div>
  );
}

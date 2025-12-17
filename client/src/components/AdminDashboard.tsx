import { useState, useEffect } from 'react';
import { ShieldCheckIcon, UsersIcon, ArrowTrendingUpIcon, TrophyIcon, ArrowLeftIcon, SparklesIcon, ArrowPathIcon, BoltIcon, ChartBarIcon, ArrowDownTrayIcon, UserCircleIcon, PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

type AdminTab = 'overview' | 'predictions' | 'profiles';

interface WinRateByDate {
  run_date: string;
  total: number;
  wins: number;
  losses: number;
  avg_pnl: number;
  winRate: string;
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

interface UserProfile {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  subscriptionStatus: string;
  tradingStyle: string;
  riskTolerance: string;
  experienceLevel: string;
  tier: string;
  createdAt: string;
}

interface BusinessMetrics {
  mrr: string;
  arr: string;
  monthlyPrice: number;
  activeSubscribers: number;
  totalUsers: number;
  freeUsers: number;
  conversionRate: string;
  predictionWinRate: string;
}

export default function AdminDashboard({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUsers, setShowUsers] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [finalizingStocks, setFinalizingStocks] = useState(false);
  const [finalizeResult, setFinalizeResult] = useState<string | null>(null);
  const [adminKey, setAdminKey] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [businessMetrics, setBusinessMetrics] = useState<BusinessMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [winRateByDate, setWinRateByDate] = useState<WinRateByDate[]>([]);
  const [loadingWinRates, setLoadingWinRates] = useState(false);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [editingProfile, setEditingProfile] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', email: '', phone: '' });

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

  const fetchProfiles = async () => {
    setLoadingProfiles(true);
    try {
      const res = await adminFetch('/api/admin/profiles');
      const json = await res.json();
      if (json.success) setProfiles(json.profiles);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingProfiles(false);
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

  const fetchWinRates = async () => {
    setLoadingWinRates(true);
    try {
      const res = await adminFetch('/api/admin/win-rates');
      const json = await res.json();
      if (json.success) {
        setWinRateByDate(json.data.byDate || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingWinRates(false);
    }
  };

  const forceFinalize = async () => {
    setFinalizingStocks(true);
    setFinalizeResult(null);
    try {
      const res = await adminFetch('/api/oracle/finalize?force=true');
      const json = await res.json();
      if (json.success) {
        setFinalizeResult(`Finalized ${json.finalized} predictions for ${json.date}`);
        fetchStats();
        fetchWinRates();
      } else {
        setFinalizeResult(`Error: ${json.error || 'Unknown error'}`);
      }
    } catch (e: any) {
      setFinalizeResult(`Error: ${e.message}`);
    } finally {
      setFinalizingStocks(false);
    }
  };

  const startEditProfile = (profile: UserProfile) => {
    setEditingProfile(profile.id);
    setEditForm({
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      email: profile.email || '',
      phone: profile.phone || ''
    });
  };

  const saveProfile = async (profileId: string) => {
    try {
      const res = await adminFetch(`/api/admin/profiles/${profileId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      const json = await res.json();
      if (json.success) {
        setProfiles(profiles.map(p => 
          p.id === profileId 
            ? { ...p, ...editForm } 
            : p
        ));
        setEditingProfile(null);
      } else {
        console.error('Failed to save profile:', json.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const exportToCsv = (filename: string, data: object[]) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => JSON.stringify((row as any)[h] ?? '')).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchStats();
    fetchBusinessMetrics();
  }, []);

  useEffect(() => {
    if (activeTab === 'predictions' && winRateByDate.length === 0) {
      fetchWinRates();
    } else if (activeTab === 'profiles' && profiles.length === 0) {
      fetchProfiles();
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-cyan-400 animate-pulse">Loading admin data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
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
              <div className="h-10 w-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center">
                <ShieldCheckIcon className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
                <p className="text-xs text-slate-500">Sentinel Command Center</p>
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
            onClick={() => setActiveTab('profiles')}
            className={`px-4 py-2 rounded-t-lg flex items-center gap-2 text-sm font-medium transition-colors ${
              activeTab === 'profiles' 
                ? 'bg-slate-800 text-purple-400 border-b-2 border-purple-400' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
            data-testid="tab-profiles"
          >
            <UserCircleIcon className="h-4 w-4" />
            User Profiles
          </button>
          <button
            onClick={() => setActiveTab('predictions')}
            className={`px-4 py-2 rounded-t-lg flex items-center gap-2 text-sm font-medium transition-colors ${
              activeTab === 'predictions' 
                ? 'bg-slate-800 text-green-400 border-b-2 border-green-400' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
            data-testid="tab-predictions"
          >
            <ChartBarIcon className="h-4 w-4" />
            Predictions
          </button>
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <>
            {/* Business Metrics */}
            {loadingMetrics ? (
              <div className="text-cyan-400 animate-pulse text-sm">Loading metrics...</div>
            ) : businessMetrics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="text-slate-400 text-xs mb-1">MRR</div>
                  <div className="text-2xl font-bold text-green-400">${businessMetrics.mrr}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="text-slate-400 text-xs mb-1">ARR</div>
                  <div className="text-2xl font-bold text-green-400">${businessMetrics.arr}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="text-slate-400 text-xs mb-1">Subscribers</div>
                  <div className="text-2xl font-bold text-amber-400">{businessMetrics.activeSubscribers}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="text-slate-400 text-xs mb-1">Conversion</div>
                  <div className="text-2xl font-bold text-cyan-400">{businessMetrics.conversionRate}%</div>
                </div>
              </div>
            )}

            {/* Core Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <UsersIcon className="h-4 w-4 text-cyan-400" />
                  <span className="text-slate-400 text-xs">Total Users</span>
                </div>
                <div className="text-2xl font-bold text-white">{stats?.users.total || 0}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <SparklesIcon className="h-4 w-4 text-amber-400" />
                  <span className="text-slate-400 text-xs">Premium</span>
                </div>
                <div className="text-2xl font-bold text-amber-400">{stats?.users.byTier?.PREMIUM || 0}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowTrendingUpIcon className="h-4 w-4 text-green-400" />
                  <span className="text-slate-400 text-xs">Predictions</span>
                </div>
                <div className="text-2xl font-bold text-white">{stats?.predictions.total || 0}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrophyIcon className="h-4 w-4 text-green-400" />
                  <span className="text-slate-400 text-xs">Win Rate</span>
                </div>
                <div className="text-2xl font-bold text-green-400">{stats?.predictions.winRate || 0}%</div>
                <div className="text-xs text-slate-500">{stats?.predictions.wins || 0}W / {stats?.predictions.losses || 0}L</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <BoltIcon className="h-4 w-4 text-cyan-400" />
                Quick Actions
              </h3>
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={forceFinalize}
                  disabled={finalizingStocks}
                  className="px-4 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 rounded-lg flex items-center gap-2 border border-cyan-500/30 disabled:opacity-50 transition-all text-sm"
                  data-testid="button-finalize"
                >
                  <BoltIcon className={`h-4 w-4 ${finalizingStocks ? 'animate-spin' : ''}`} />
                  {finalizingStocks ? 'Finalizing...' : 'Finalize Today\'s Predictions'}
                </button>
                <button 
                  onClick={() => { setShowUsers(true); fetchUsers(); }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm"
                  data-testid="button-view-users"
                >
                  View All Users
                </button>
              </div>
              {finalizeResult && (
                <div className={`mt-3 p-2 rounded text-sm ${
                  finalizeResult.startsWith('Error') 
                    ? 'bg-red-900/30 text-red-400' 
                    : 'bg-green-900/30 text-green-400'
                }`}>
                  {finalizeResult}
                </div>
              )}
            </div>

            {/* Recent Users */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Recent Sign-ups</h3>
              <div className="space-y-2">
                {stats?.recentUsers?.slice(0, 5).map(user => (
                  <div key={user.id} className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
                    <div className="text-white text-sm">{user.email}</div>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
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

            {/* Users Modal */}
            {showUsers && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setShowUsers(false)}>
                <div 
                  className="bg-slate-900 border border-cyan-500/30 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                  data-testid="users-modal"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <UsersIcon className="h-5 w-5 text-cyan-400" />
                      All Users ({users.length})
                    </h3>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => exportToCsv(`users_${new Date().toISOString().split('T')[0]}.csv`, users)}
                        className="px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 rounded text-xs flex items-center gap-2 border border-cyan-500/30"
                        data-testid="btn-download-users"
                      >
                        <ArrowDownTrayIcon className="h-3 w-3" />
                        CSV
                      </button>
                      <button 
                        onClick={() => setShowUsers(false)}
                        className="text-slate-400 hover:text-white text-xl px-2"
                        data-testid="button-close-users-modal"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <div className="overflow-y-auto max-h-[60vh]">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-slate-900">
                        <tr className="border-b border-slate-800">
                          <th className="text-left py-2 px-3 text-slate-400 text-xs font-medium">Email</th>
                          <th className="text-left py-2 px-3 text-slate-400 text-xs font-medium">Tier</th>
                          <th className="text-right py-2 px-3 text-slate-400 text-xs font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(user => (
                          <tr key={user.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                            <td className="py-2 px-3 text-white">{user.email}</td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                user.tier === 'PREMIUM' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-400'
                              }`}>
                                {user.tier}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right">
                              <button
                                onClick={() => handleToggleTier(user.id, user.tier)}
                                disabled={updating === user.id}
                                className={`text-xs px-2 py-1 rounded ${
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
              </div>
            )}
          </>
        )}

        {/* USER PROFILES TAB */}
        {activeTab === 'profiles' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">User Profiles</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => exportToCsv(`profiles_${new Date().toISOString().split('T')[0]}.csv`, profiles)}
                  disabled={loadingProfiles || profiles.length === 0}
                  className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded text-xs flex items-center gap-2 border border-purple-500/30 disabled:opacity-50"
                  data-testid="btn-download-profiles"
                >
                  <ArrowDownTrayIcon className="h-3 w-3" />
                  CSV
                </button>
                <button
                  onClick={fetchProfiles}
                  disabled={loadingProfiles}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-purple-400 rounded text-xs flex items-center gap-2"
                  data-testid="btn-refresh-profiles"
                >
                  <ArrowPathIcon className={`h-3 w-3 ${loadingProfiles ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            {loadingProfiles ? (
              <div className="text-center py-8 text-purple-400 animate-pulse text-sm">Loading profiles...</div>
            ) : profiles.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">No user profiles yet</div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-900">
                      <tr className="border-b border-slate-800">
                        <th className="text-left py-2 px-3 text-slate-400 text-xs font-medium">Name</th>
                        <th className="text-left py-2 px-3 text-slate-400 text-xs font-medium">Email</th>
                        <th className="text-left py-2 px-3 text-slate-400 text-xs font-medium">Phone</th>
                        <th className="text-left py-2 px-3 text-slate-400 text-xs font-medium">Status</th>
                        <th className="text-left py-2 px-3 text-slate-400 text-xs font-medium">Trading</th>
                        <th className="text-right py-2 px-3 text-slate-400 text-xs font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profiles.map(profile => (
                        <tr key={profile.id} className="border-b border-slate-800/50">
                          {editingProfile === profile.id ? (
                            <>
                              <td className="py-2 px-3">
                                <div className="flex gap-1">
                                  <input
                                    value={editForm.firstName}
                                    onChange={e => setEditForm({...editForm, firstName: e.target.value})}
                                    placeholder="First"
                                    className="w-20 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white text-xs"
                                    data-testid={`input-firstname-${profile.id}`}
                                  />
                                  <input
                                    value={editForm.lastName}
                                    onChange={e => setEditForm({...editForm, lastName: e.target.value})}
                                    placeholder="Last"
                                    className="w-20 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white text-xs"
                                    data-testid={`input-lastname-${profile.id}`}
                                  />
                                </div>
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  value={editForm.email}
                                  onChange={e => setEditForm({...editForm, email: e.target.value})}
                                  placeholder="Email"
                                  className="w-40 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white text-xs"
                                  data-testid={`input-email-${profile.id}`}
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  value={editForm.phone}
                                  onChange={e => setEditForm({...editForm, phone: e.target.value})}
                                  placeholder="Phone"
                                  className="w-28 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white text-xs"
                                  data-testid={`input-phone-${profile.id}`}
                                />
                              </td>
                              <td className="py-2 px-3">
                                <span className={`px-2 py-0.5 rounded text-xs ${
                                  profile.subscriptionStatus === 'active' ? 'bg-green-600/20 text-green-400' : 'bg-slate-700 text-slate-400'
                                }`}>
                                  {profile.subscriptionStatus}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-slate-400 text-xs">
                                {profile.tradingStyle} / {profile.riskTolerance}
                              </td>
                              <td className="py-2 px-3 text-right">
                                <div className="flex gap-1 justify-end">
                                  <button
                                    onClick={() => saveProfile(profile.id)}
                                    className="p-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded"
                                    data-testid={`btn-save-${profile.id}`}
                                  >
                                    <CheckIcon className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => setEditingProfile(null)}
                                    className="p-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded"
                                    data-testid={`btn-cancel-${profile.id}`}
                                  >
                                    <XMarkIcon className="h-3 w-3" />
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="py-2 px-3 text-white">
                                {profile.firstName || profile.lastName 
                                  ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim()
                                  : <span className="text-slate-500">—</span>
                                }
                              </td>
                              <td className="py-2 px-3 text-white">{profile.email || <span className="text-slate-500">—</span>}</td>
                              <td className="py-2 px-3 text-white">{profile.phone || <span className="text-slate-500">—</span>}</td>
                              <td className="py-2 px-3">
                                <span className={`px-2 py-0.5 rounded text-xs ${
                                  profile.subscriptionStatus === 'active' ? 'bg-green-600/20 text-green-400' : 'bg-slate-700 text-slate-400'
                                }`}>
                                  {profile.subscriptionStatus}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-slate-400 text-xs">
                                {profile.tradingStyle} / {profile.riskTolerance}
                              </td>
                              <td className="py-2 px-3 text-right">
                                <button
                                  onClick={() => startEditProfile(profile)}
                                  className="p-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded"
                                  data-testid={`btn-edit-${profile.id}`}
                                >
                                  <PencilIcon className="h-3 w-3" />
                                </button>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PREDICTIONS TAB */}
        {activeTab === 'predictions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Prediction History by Date</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => exportToCsv(`predictions_${new Date().toISOString().split('T')[0]}.csv`, winRateByDate)}
                  disabled={loadingWinRates || winRateByDate.length === 0}
                  className="px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded text-xs flex items-center gap-2 border border-green-500/30 disabled:opacity-50"
                  data-testid="btn-download-predictions"
                >
                  <ArrowDownTrayIcon className="h-3 w-3" />
                  CSV
                </button>
                <button
                  onClick={fetchWinRates}
                  disabled={loadingWinRates}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-green-400 rounded text-xs flex items-center gap-2"
                  data-testid="btn-refresh-winrates"
                >
                  <ArrowPathIcon className={`h-3 w-3 ${loadingWinRates ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            {loadingWinRates ? (
              <div className="text-center py-8 text-green-400 animate-pulse text-sm">Loading...</div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-900">
                      <tr className="border-b border-slate-800">
                        <th className="text-left py-2 px-3 text-slate-400 text-xs font-medium">Date</th>
                        <th className="text-right py-2 px-3 text-slate-400 text-xs font-medium">Total</th>
                        <th className="text-right py-2 px-3 text-slate-400 text-xs font-medium">Wins</th>
                        <th className="text-right py-2 px-3 text-slate-400 text-xs font-medium">Losses</th>
                        <th className="text-right py-2 px-3 text-slate-400 text-xs font-medium">Win Rate</th>
                        <th className="text-right py-2 px-3 text-slate-400 text-xs font-medium">Avg P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {winRateByDate.map((row, i) => (
                        <tr key={i} className="border-b border-slate-800/50">
                          <td className="py-2 px-3 text-white font-mono">{row.run_date}</td>
                          <td className="py-2 px-3 text-right text-slate-300">{row.total}</td>
                          <td className="py-2 px-3 text-right text-green-400">{row.wins}</td>
                          <td className="py-2 px-3 text-right text-red-400">{row.losses}</td>
                          <td className="py-2 px-3 text-right">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              parseFloat(row.winRate) >= 60 ? 'bg-green-600/20 text-green-400' :
                              parseFloat(row.winRate) >= 40 ? 'bg-yellow-600/20 text-yellow-400' :
                              'bg-red-600/20 text-red-400'
                            }`}>
                              {row.winRate}%
                            </span>
                          </td>
                          <td className={`py-2 px-3 text-right ${row.avg_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {row.avg_pnl >= 0 ? '+' : ''}{row.avg_pnl?.toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

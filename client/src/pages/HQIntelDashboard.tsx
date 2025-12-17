import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { 
  ShieldCheckIcon, 
  CurrencyDollarIcon, 
  UsersIcon, 
  ArrowTrendingDownIcon, 
  SparklesIcon,
  ArrowLeftIcon,
  ChartBarIcon,
  BoltIcon,
  FireIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

interface HQIntelData {
  kpis: {
    mrr: number;
    mrrFormatted: string;
    totalOperatives: number;
    premiumOperatives: number;
    churnRate: string;
    avgLtv: string;
    avgLtvFormatted: string;
  };
  onboarding: {
    experienceLevels: { level: string; count: number }[];
    marketingSources: { source: string; count: number }[];
  };
  retention: {
    dau: number;
    wau: number;
    mau: number;
    signalEngagementToday: number;
    heatModalClicks: number;
    accuracyModalClicks: number;
  };
}

export default function HQIntelDashboard() {
  const [, setLocation] = useLocation();
  const [data, setData] = useState<HQIntelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const res = await fetch('/api/admin/hq-intel/check');
      const json = await res.json();
      
      if (!json.hasAccess) {
        setHasAccess(false);
        setLocation('/');
        return;
      }
      
      setHasAccess(true);
      fetchData();
    } catch (e) {
      console.error('Access check failed:', e);
      setLocation('/');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/hq-intel');
      const json = await res.json();
      
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || 'Failed to load data');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  if (hasAccess === false) {
    return null;
  }

  if (loading || hasAccess === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-amber-500 animate-pulse font-mono text-sm">
          ACCESSING HQ INTEL...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-red-500 font-mono text-sm">ERROR: {error}</div>
      </div>
    );
  }

  const formatLabel = (str: string) => {
    if (!str || str === 'unknown' || str === 'null') return 'Unknown';
    return str.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const getExperienceColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'beginner': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'intermediate': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'advanced': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getSourceColor = (source: string) => {
    switch (source?.toLowerCase()) {
      case 'google': return 'bg-blue-500/20 text-blue-400';
      case 'twitter': return 'bg-sky-500/20 text-sky-400';
      case 'youtube': return 'bg-red-500/20 text-red-400';
      case 'reddit': return 'bg-orange-500/20 text-orange-400';
      case 'friend': return 'bg-green-500/20 text-green-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-mono" data-testid="hq-intel-dashboard">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLocation('/')}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-amber-500/30 text-amber-500"
              data-testid="button-back"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-amber-500 flex items-center gap-2">
                <ShieldCheckIcon className="h-7 w-7" />
                HQ INTEL DASHBOARD
              </h1>
              <p className="text-slate-500 text-xs">CLASSIFIED • EXECUTIVE OVERVIEW</p>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg text-amber-500 text-sm flex items-center gap-2"
            data-testid="button-refresh"
          >
            <BoltIcon className="h-4 w-4" />
            REFRESH
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 border border-amber-500/30 rounded-xl p-5" data-testid="kpi-mrr">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-xs uppercase tracking-wider">MRR</span>
              <CurrencyDollarIcon className="h-5 w-5 text-amber-500" />
            </div>
            <div className="text-3xl font-bold text-amber-400" data-testid="value-mrr">
              {data?.kpis.mrrFormatted || '$0'}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {data?.kpis.premiumOperatives || 0} Premium × $29
            </div>
          </div>

          <div className="bg-slate-900/80 border border-amber-500/30 rounded-xl p-5" data-testid="kpi-operatives">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-xs uppercase tracking-wider">Total Operatives</span>
              <UsersIcon className="h-5 w-5 text-amber-500" />
            </div>
            <div className="text-3xl font-bold text-amber-400" data-testid="value-operatives">
              {data?.kpis.totalOperatives || 0}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Registered Users
            </div>
          </div>

          <div className="bg-slate-900/80 border border-amber-500/30 rounded-xl p-5" data-testid="kpi-churn">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-xs uppercase tracking-wider">Churn Rate</span>
              <ArrowTrendingDownIcon className="h-5 w-5 text-amber-500" />
            </div>
            <div className="text-3xl font-bold text-amber-400" data-testid="value-churn">
              {data?.kpis.churnRate || '0'}%
            </div>
            <div className="text-xs text-slate-500 mt-1">
              30-Day Rolling
            </div>
          </div>

          <div className="bg-slate-900/80 border border-amber-500/30 rounded-xl p-5" data-testid="kpi-ltv">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-xs uppercase tracking-wider">Avg LTV</span>
              <SparklesIcon className="h-5 w-5 text-amber-500" />
            </div>
            <div className="text-3xl font-bold text-amber-400" data-testid="value-ltv">
              {data?.kpis.avgLtvFormatted || '$0'}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Lifetime Value
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900/80 border border-amber-500/30 rounded-xl p-5" data-testid="onboarding-experience">
            <div className="flex items-center gap-2 mb-4">
              <ChartBarIcon className="h-5 w-5 text-amber-500" />
              <h2 className="text-lg font-semibold text-amber-400">Experience Levels</h2>
            </div>
            <div className="space-y-3">
              {(data?.onboarding.experienceLevels || []).length === 0 ? (
                <div className="text-slate-500 text-sm">No data yet</div>
              ) : (
                data?.onboarding.experienceLevels.map((item, i) => {
                  const total = data.onboarding.experienceLevels.reduce((sum, x) => sum + x.count, 0);
                  const pct = total > 0 ? (item.count / total) * 100 : 0;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className={`px-2 py-0.5 rounded border ${getExperienceColor(item.level)}`}>
                          {formatLabel(item.level)}
                        </span>
                        <span className="text-slate-400">{item.count} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-amber-500/50 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-slate-900/80 border border-amber-500/30 rounded-xl p-5" data-testid="onboarding-marketing">
            <div className="flex items-center gap-2 mb-4">
              <FireIcon className="h-5 w-5 text-amber-500" />
              <h2 className="text-lg font-semibold text-amber-400">Marketing Sources</h2>
            </div>
            <div className="space-y-3">
              {(data?.onboarding.marketingSources || []).length === 0 ? (
                <div className="text-slate-500 text-sm">No data yet</div>
              ) : (
                data?.onboarding.marketingSources.map((item, i) => {
                  const total = data.onboarding.marketingSources.reduce((sum, x) => sum + x.count, 0);
                  const pct = total > 0 ? (item.count / total) * 100 : 0;
                  return (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50">
                      <span className={`px-2 py-1 rounded text-xs ${getSourceColor(item.source)}`}>
                        {formatLabel(item.source)}
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-amber-500/70 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-slate-400 text-sm w-16 text-right">
                          {item.count} ({pct.toFixed(0)}%)
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-slate-900/80 border border-amber-500/30 rounded-xl p-4 text-center" data-testid="retention-dau">
            <div className="text-slate-400 text-xs uppercase tracking-wider mb-2">DAU</div>
            <div className="text-2xl font-bold text-amber-400">{data?.retention.dau || 0}</div>
            <div className="text-xs text-slate-500 mt-1">Last 24h</div>
          </div>

          <div className="bg-slate-900/80 border border-amber-500/30 rounded-xl p-4 text-center" data-testid="retention-wau">
            <div className="text-slate-400 text-xs uppercase tracking-wider mb-2">WAU</div>
            <div className="text-2xl font-bold text-amber-400">{data?.retention.wau || 0}</div>
            <div className="text-xs text-slate-500 mt-1">Last 7 Days</div>
          </div>

          <div className="bg-slate-900/80 border border-amber-500/30 rounded-xl p-4 text-center" data-testid="retention-mau">
            <div className="text-slate-400 text-xs uppercase tracking-wider mb-2">MAU</div>
            <div className="text-2xl font-bold text-amber-400">{data?.retention.mau || 0}</div>
            <div className="text-xs text-slate-500 mt-1">Last 30 Days</div>
          </div>

          <div className="bg-slate-900/80 border border-amber-500/30 rounded-xl p-4 text-center" data-testid="retention-engagement">
            <div className="text-slate-400 text-xs uppercase tracking-wider mb-2">Engagement</div>
            <div className="text-2xl font-bold text-amber-400">{data?.retention.signalEngagementToday || 0}</div>
            <div className="text-xs text-slate-500 mt-1">Today</div>
          </div>

          <div className="bg-slate-900/80 border border-amber-500/30 rounded-xl p-4 text-center" data-testid="retention-heat">
            <div className="text-slate-400 text-xs uppercase tracking-wider mb-2">Heat Modal</div>
            <div className="text-2xl font-bold text-amber-400">{data?.retention.heatModalClicks || 0}</div>
            <div className="text-xs text-slate-500 mt-1">Clicks Today</div>
          </div>

          <div className="bg-slate-900/80 border border-amber-500/30 rounded-xl p-4 text-center" data-testid="retention-accuracy">
            <div className="text-slate-400 text-xs uppercase tracking-wider mb-2">Accuracy Modal</div>
            <div className="text-2xl font-bold text-amber-400">{data?.retention.accuracyModalClicks || 0}</div>
            <div className="text-xs text-slate-500 mt-1">Clicks Today</div>
          </div>
        </div>

        <div className="text-center py-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <CalendarIcon className="h-4 w-4 text-amber-500" />
            <span className="text-xs text-amber-400">
              Last Updated: {new Date().toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { ArrowLeftIcon, BuildingOfficeIcon, UserGroupIcon, ChartBarIcon, CurrencyDollarIcon, ArrowTrendingDownIcon, ClockIcon, CursorArrowRaysIcon } from '@heroicons/react/24/outline';

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

interface Props {
  onBack: () => void;
}

export default function HQIntelDashboard({ onBack }: Props) {
  const [data, setData] = useState<HQIntelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/hq-intel')
      .then(res => {
        if (!res.ok) {
          if (res.status === 403) throw new Error('Access denied');
          throw new Error('Failed to fetch HQ Intel data');
        }
        return res.json();
      })
      .then(json => {
        if (json.success) {
          setData(json.data);
        } else {
          throw new Error(json.error || 'Unknown error');
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-amber-500 font-mono animate-pulse">Loading HQ Intel...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <div className="text-red-500 font-mono">{error}</div>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700"
          data-testid="button-back-error"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!data) return null;

  const experienceColors: Record<string, string> = {
    beginner: 'bg-green-600',
    intermediate: 'bg-amber-600',
    advanced: 'bg-red-600',
    unknown: 'bg-slate-600',
  };

  const sourceColors: Record<string, string> = {
    google: 'bg-blue-600',
    twitter: 'bg-sky-500',
    youtube: 'bg-red-500',
    friend: 'bg-purple-600',
    reddit: 'bg-orange-600',
    other: 'bg-slate-500',
    unknown: 'bg-slate-600',
  };

  const totalExperience = data.onboarding.experienceLevels.reduce((sum, e) => sum + e.count, 0);
  const totalSources = data.onboarding.marketingSources.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="border-b border-amber-900/30 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            data-testid="button-back"
          >
            <ArrowLeftIcon className="w-5 h-5 text-amber-500" />
          </button>
          <div className="flex items-center gap-3">
            <BuildingOfficeIcon className="w-8 h-8 text-amber-500" />
            <div>
              <h1 className="text-xl font-bold text-amber-400 font-mono">HQ INTEL DASHBOARD</h1>
              <p className="text-xs text-slate-400 font-mono">Business Intelligence Command Center</p>
            </div>
          </div>
          <div className="ml-auto px-3 py-1 bg-amber-600/20 border border-amber-600/50 rounded text-amber-400 text-xs font-mono">
            CLASSIFIED
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="kpi-grid">
          <KPICard
            title="MRR"
            value={data.kpis.mrrFormatted}
            subtitle={`${data.kpis.premiumOperatives} Premium Subscribers`}
            icon={<CurrencyDollarIcon className="w-6 h-6" />}
            color="amber"
            testId="kpi-mrr"
          />
          <KPICard
            title="TOTAL OPERATIVES"
            value={data.kpis.totalOperatives.toLocaleString()}
            subtitle="Registered Users"
            icon={<UserGroupIcon className="w-6 h-6" />}
            color="amber"
            testId="kpi-total-operatives"
          />
          <KPICard
            title="CHURN RATE"
            value={`${data.kpis.churnRate}%`}
            subtitle="30-Day Cancellations"
            icon={<ArrowTrendingDownIcon className="w-6 h-6" />}
            color={parseFloat(data.kpis.churnRate) > 5 ? 'red' : 'amber'}
            testId="kpi-churn-rate"
          />
          <KPICard
            title="AVG LTV"
            value={data.kpis.avgLtvFormatted}
            subtitle="Lifetime Value per User"
            icon={<ChartBarIcon className="w-6 h-6" />}
            color="amber"
            testId="kpi-avg-ltv"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900/50 border border-amber-900/30 rounded-xl p-6">
            <h2 className="text-lg font-bold text-amber-400 font-mono mb-4 flex items-center gap-2">
              <UserGroupIcon className="w-5 h-5" />
              EXPERIENCE LEVELS
            </h2>
            <div className="space-y-3">
              {data.onboarding.experienceLevels.map(item => (
                <div key={item.level} className="flex items-center gap-3">
                  <div className="w-24 text-sm text-slate-400 capitalize font-mono">{item.level}</div>
                  <div className="flex-1 h-6 bg-slate-800 rounded overflow-hidden">
                    <div
                      className={`h-full ${experienceColors[item.level] || 'bg-slate-600'} transition-all duration-500`}
                      style={{ width: `${totalExperience > 0 ? (item.count / totalExperience) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="w-16 text-right text-sm font-mono text-white">{item.count}</div>
                  <div className="w-12 text-right text-xs text-slate-400">
                    {totalExperience > 0 ? ((item.count / totalExperience) * 100).toFixed(0) : 0}%
                  </div>
                </div>
              ))}
              {data.onboarding.experienceLevels.length === 0 && (
                <div className="text-slate-500 text-sm font-mono">No data available</div>
              )}
            </div>
          </div>

          <div className="bg-slate-900/50 border border-amber-900/30 rounded-xl p-6">
            <h2 className="text-lg font-bold text-amber-400 font-mono mb-4 flex items-center gap-2">
              <ChartBarIcon className="w-5 h-5" />
              MARKETING SOURCES
            </h2>
            <div className="space-y-3">
              {data.onboarding.marketingSources.map(item => (
                <div key={item.source} className="flex items-center gap-3">
                  <div className="w-24 text-sm text-slate-400 capitalize font-mono">{item.source}</div>
                  <div className="flex-1 h-6 bg-slate-800 rounded overflow-hidden">
                    <div
                      className={`h-full ${sourceColors[item.source] || 'bg-slate-600'} transition-all duration-500`}
                      style={{ width: `${totalSources > 0 ? (item.count / totalSources) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="w-16 text-right text-sm font-mono text-white">{item.count}</div>
                  <div className="w-12 text-right text-xs text-slate-400">
                    {totalSources > 0 ? ((item.count / totalSources) * 100).toFixed(0) : 0}%
                  </div>
                </div>
              ))}
              {data.onboarding.marketingSources.length === 0 && (
                <div className="text-slate-500 text-sm font-mono">No data available</div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <RetentionCard
            title="DAU"
            value={data.retention.dau}
            subtitle="Daily Active Users (24h)"
            icon={<ClockIcon className="w-5 h-5" />}
          />
          <RetentionCard
            title="WAU"
            value={data.retention.wau}
            subtitle="Weekly Active Users (7d)"
            icon={<ClockIcon className="w-5 h-5" />}
          />
          <RetentionCard
            title="MAU"
            value={data.retention.mau}
            subtitle="Monthly Active Users (30d)"
            icon={<ClockIcon className="w-5 h-5" />}
          />
          <RetentionCard
            title="SIGNAL CLICKS"
            value={data.retention.signalEngagementToday}
            subtitle={`Heat: ${data.retention.heatModalClicks} | Accuracy: ${data.retention.accuracyModalClicks}`}
            icon={<CursorArrowRaysIcon className="w-5 h-5" />}
          />
        </div>

        <div className="bg-slate-900/30 border border-slate-800 rounded-lg p-4 text-center">
          <p className="text-xs text-slate-500 font-mono">
            Data refreshed on page load | Last updated: {new Date().toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, subtitle, icon, color, testId }: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color: 'amber' | 'red';
  testId?: string;
}) {
  const colorClasses = color === 'amber' 
    ? 'border-amber-900/30 bg-gradient-to-br from-amber-950/20 to-slate-900/50'
    : 'border-red-900/30 bg-gradient-to-br from-red-950/20 to-slate-900/50';
  const iconColor = color === 'amber' ? 'text-amber-500' : 'text-red-500';
  const valueColor = color === 'amber' ? 'text-amber-400' : 'text-red-400';

  return (
    <div className={`border rounded-xl p-6 ${colorClasses}`} data-testid={testId || `kpi-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-start justify-between mb-2">
        <span className={iconColor}>{icon}</span>
        <span className="text-xs text-slate-500 font-mono">{title}</span>
      </div>
      <div className={`text-3xl font-bold font-mono ${valueColor}`}>{value}</div>
      <div className="text-xs text-slate-400 mt-1">{subtitle}</div>
    </div>
  );
}

function RetentionCard({ title, value, subtitle, icon }: {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="border border-amber-900/20 bg-slate-900/30 rounded-xl p-4" data-testid={`retention-${title.toLowerCase()}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-amber-500">{icon}</span>
        <span className="text-xs text-slate-400 font-mono">{title}</span>
      </div>
      <div className="text-2xl font-bold font-mono text-white">{value.toLocaleString()}</div>
      <div className="text-xs text-slate-500 mt-1">{subtitle}</div>
    </div>
  );
}

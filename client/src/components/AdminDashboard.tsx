import { useQuery, useMutation } from "@tanstack/react-query";
import { Users, Target, TrendingUp, Activity, ShieldCheck, ArrowLeft, LayoutDashboard, Play, CheckCircle, Database, Zap, Cpu } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import Skeleton from "@/components/Skeleton";

interface Operative {
  id: number; email: string; tier: string; is_premium: boolean;
}

interface Stats {
  totalUsers: number; mrr: number; conversionRate: number; aiWinRate: number; users: Operative[];
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();

  const { data: stats, isLoading, error } = useQuery<Stats>({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const res = await fetch('/api/admin/stats', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Status: ${res.status}`);
      return res.json();
    },
  });

  // Manual override mutations
  const runScanMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/run-scan', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to run Oracle scan');
      return res.json();
    },
  });

  const checkAccuracyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/check-accuracy', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to check accuracy');
      return res.json();
    },
  });

  if (isLoading) return <div className="p-8"><Skeleton className="h-[400px] w-full" /></div>;
  if (error) return <div className="p-8 text-red-500 font-mono">ERROR: ACCESS_REVOKED</div>;

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Sidebar Navigation */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800">
        <div className="h-16 flex items-center justify-center px-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <div>
              <h1 className="font-bold text-white tracking-wide text-sm">ADMIN_PANEL</h1>
              <p className="text-[10px] text-cyan-500 font-mono">SENTINEL_OS</p>
            </div>
          </div>
        </div>
        <nav className="p-4 space-y-2">
          <button
            onClick={() => setLocation("/")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 transition-all"
          >
            <LayoutDashboard className="h-5 w-5" />
            <span className="font-medium">Dashboard</span>
          </button>
          <button
            onClick={() => setLocation("/admin/predictions")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
          >
            <Target className="h-5 w-5" />
            <span className="font-medium">Predictions</span>
          </button>
          <button
            onClick={() => setLocation("/admin/users")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
          >
            <Users className="h-5 w-5" />
            <span className="font-medium">Users</span>
          </button>
        </nav>
      </aside>

      <div className="ml-64 flex-1 space-y-6 p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight text-foreground font-mono">
            SENTINEL_OS // MISSION_CONTROL
          </h2>
        </div>

        {/* Sentinel Pulse - Status Header */}
        <Card className="border-cyan-500/30 bg-slate-900/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-mono flex items-center gap-3 text-cyan-400">
              <Cpu className="h-6 w-6" />
              SENTINEL_PULSE // SYSTEM_STATUS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-orange-400" />
                  <span className="text-sm font-medium text-slate-400">Predictions Generated</span>
                </div>
                <div className="text-3xl font-bold text-white">--</div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                  <span className="text-sm font-medium text-slate-400">System Win Rate</span>
                </div>
                <div className="text-3xl font-bold text-green-400">--%</div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-cyan-400" />
                  <span className="text-sm font-medium text-slate-400">Database Status</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-lg font-bold text-green-400">NEON_CONNECTED</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Control - Streamlined User Table */}
        <Card className="border-orange-500/30 bg-slate-900/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-mono flex items-center gap-3 text-orange-400">
              <Users className="h-6 w-6" />
              USER_CONTROL // OPERATIVE_REGISTRY
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-slate-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-800/50 border-b border-slate-700">
                  <tr>
                    <th className="p-4 text-left font-medium text-slate-300">Email</th>
                    <th className="p-4 text-left font-medium text-slate-300">Tier</th>
                    <th className="p-4 text-left font-medium text-slate-300">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {stats?.users?.map((op) => (
                    <tr key={op.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 font-mono text-slate-200">{op.email}</td>
                      <td className="p-4">
                        <span className="px-3 py-1 bg-slate-700 rounded-full text-xs font-bold text-cyan-400 uppercase">
                          {op.tier}
                        </span>
                      </td>
                      <td className="p-4">
                        {String(op.is_premium) === "true" ? (
                          <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-bold border border-green-500/30">
                            PREMIUM_ACCESS
                          </span>
                        ) : (
                          <span className="bg-slate-500/20 text-slate-400 px-3 py-1 rounded-full text-xs font-bold border border-slate-500/30">
                            STANDARD
                          </span>
                        )}
                      </td>
                    </tr>
                  )) || (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-slate-500">
                        Loading operative registry...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Manual Override - Admin Control Buttons */}
        <Card className="border-red-500/30 bg-slate-900/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-mono flex items-center gap-3 text-red-400">
              <Zap className="h-6 w-6" />
              MANUAL_OVERRIDE // ADMIN_CONTROLS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <Button
                className="h-16 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-bold text-lg border border-cyan-500/50 disabled:opacity-50"
                onClick={() => runScanMutation.mutate()}
                disabled={runScanMutation.isPending}
              >
                {runScanMutation.isPending ? (
                  <Activity className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Play className="mr-2 h-5 w-5" />
                )}
                {runScanMutation.isPending ? 'SCANNING...' : 'RUN_ORACLE_SCAN'}
              </Button>
              <Button
                className="h-16 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-bold text-lg border border-orange-500/50 disabled:opacity-50"
                onClick={() => checkAccuracyMutation.mutate()}
                disabled={checkAccuracyMutation.isPending}
              >
                {checkAccuracyMutation.isPending ? (
                  <Activity className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-5 w-5" />
                )}
                {checkAccuracyMutation.isPending ? 'CHECKING...' : 'CHECK_ACCURACY'}
              </Button>
            </div>
            <div className="mt-6 space-y-3">
              {/* Status Messages */}
              {runScanMutation.isSuccess && (
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <p className="text-sm text-green-400 font-mono">
                    <span className="text-green-300">SUCCESS:</span> Oracle scan completed successfully.
                  </p>
                </div>
              )}
              {runScanMutation.isError && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-400 font-mono">
                    <span className="text-red-300">ERROR:</span> Oracle scan failed - {runScanMutation.error?.message}
                  </p>
                </div>
              )}
              {checkAccuracyMutation.isSuccess && (
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <p className="text-sm text-green-400 font-mono">
                    <span className="text-green-300">SUCCESS:</span> Accuracy check completed successfully.
                  </p>
                </div>
              )}
              {checkAccuracyMutation.isError && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-400 font-mono">
                    <span className="text-red-300">ERROR:</span> Accuracy check failed - {checkAccuracyMutation.error?.message}
                  </p>
                </div>
              )}

              <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <p className="text-sm text-slate-400 font-mono">
                  <span className="text-cyan-400">SYSTEM_LOG:</span> Manual overrides require admin authentication.
                  Use these controls to trigger system operations outside normal cycles.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

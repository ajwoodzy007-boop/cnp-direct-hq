import { useQuery } from "@tanstack/react-query";
import { Users, Target, TrendingUp, Activity, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Skeleton from "@/components/Skeleton";

interface Operative {
  id: number;
  email: string;
  tier: string;
  is_premium: boolean;
}

interface Stats {
  totalUsers: number;
  mrr: number;
  conversionRate: number;
  aiWinRate: number;
  users: Operative[];
}

export default function AdminDashboard() {
  const { data: stats, isLoading, error } = useQuery<Stats>({
    queryKey: ["/api/admin/stats"],
  });

  if (isLoading) return <div className="p-8"><Skeleton className="h-[400px] w-full" /></div>;
  if (error) return <div className="p-8 text-red-500 font-mono">CRITICAL: UNAUTHORIZED</div>;

  const operatives = stats?.users || [];

  return (
    <div className="flex-1 space-y-4 p-8 pt-6 bg-background">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-foreground font-mono">
          SENTINEL_OS // ADMIN_COMMAND
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* KPI CARDS */}
        <Card className="border-primary/20 bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Operatives</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
          </CardContent>
        </Card>
        {/* ... Other cards omitted for brevity but present in full file ... */}
      </div>

      <Card className="border-primary/20 bg-card/50">
        <CardHeader>
          <CardTitle className="text-xl font-mono flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            OPERATIVE_REGISTRY
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                <tr>
                  <th className="p-3 text-left">Email</th>
                  <th className="p-3 text-left">Clearance</th>
                  <th className="p-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {operatives.map((op) => (
                  <tr key={op.id} className="hover:bg-primary/5 transition-colors">
                    <td className="p-3 font-mono">{op.email}</td>
                    <td className="p-3">
                      <span className={`text-xs font-bold ${op.tier === 'ADMIN' ? 'text-primary' : 'text-slate-500'}`}>
                        {op.tier}
                      </span>
                    </td>
                    <td className="p-3">
                      {/* FIXED LOGIC: Correctly check the premium boolean */}
                      {op.is_premium === true ? (
                        <span className="bg-green-500/10 text-green-500 px-2 py-1 rounded-full text-[10px] font-bold ring-1 ring-green-500/20">
                          PREMIUM
                        </span>
                      ) : (
                        <span className="bg-slate-500/10 text-slate-500 px-2 py-1 rounded-full text-[10px] font-bold ring-1 ring-slate-500/20">
                          STANDARD
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

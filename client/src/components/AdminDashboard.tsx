import { useQuery } from "@tanstack/react-query";
import { 
  Users, 
  Target, 
  TrendingUp, 
  Activity,
  ShieldCheck,
  UserPlus
} from "lucide-react";
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
  
  if (error) {
    return (
      <div className="p-8 text-red-500">
        Authentication Error: Sentinel OS Access Denied.
      </div>
    );
  }

  const operatives = stats?.users || [];

  return (
    <div className="flex-1 space-y-4 p-8 pt-6 bg-background">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-foreground font-mono">
          SENTINEL_OS // ADMIN_COMMAND
        </h2>
      </div>

      {/* KPI GRID */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-primary/20 bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Operatives</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">+2 from last session</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR Projection</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.mrr || 0}</div>
            <p className="text-xs text-muted-foreground">+12% growth curve</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Activity className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.conversionRate || 0}%</div>
            <p className="text-xs text-muted-foreground">Optimized for Tier-1</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Intelligence Accuracy</CardTitle>
            <Target className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.aiWinRate || 0}%</div>
            <p className="text-xs text-muted-foreground">Institutional-Grade</p>
          </CardContent>
        </Card>
      </div>

      {/* OPERATIVE TABLE - STATIC RENDER (ZERO EVAL) */}
      <Card className="border-primary/20 bg-card/50">
        <CardHeader>
          <CardTitle className="text-xl font-mono flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            ACTIVE_OPERATIVE_REGISTRY
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                <tr>
                  <th className="p-3 text-left font-medium">Operative (Email)</th>
                  <th className="p-3 text-left font-medium">Clearance (Tier)</th>
                  <th className="p-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {operatives.length > 0 ? (
                  operatives.map((op) => (
                    <tr key={op.id} className="hover:bg-primary/5 transition-colors">
                      <td className="p-3 font-mono">{op.email}</td>
                      <td className="p-3 text-primary uppercase text-xs font-bold">{op.tier}</td>
                      <td className="p-3">
                        {op.is_premium ? (
                          <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-1 text-xs font-medium text-green-500 ring-1 ring-inset ring-green-500/20">
                            PREMIUM
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-yellow-500/10 px-2 py-1 text-xs font-medium text-yellow-500 ring-1 ring-inset ring-yellow-500/20">
                            STANDARD
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-muted-foreground italic">
                      No operatives found in the database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

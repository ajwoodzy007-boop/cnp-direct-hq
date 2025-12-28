import { useQuery } from "@tanstack/react-query";
import { 
  Users, Target, TrendingUp, Activity, ShieldCheck, ArrowLeft 
} from "lucide-react";
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
  });

  if (isLoading) return <div className="p-8"><Skeleton className="h-[400px] w-full" /></div>;
  if (error) return <div className="p-8 text-red-500 font-mono">CRITICAL: UNAUTHORIZED</div>;

  return (
    <div className="flex-1 space-y-4 p-8 pt-6 bg-background">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-foreground font-mono">
          SENTINEL_OS // ADMIN_COMMAND
        </h2>
        {/* NAVIGATION FIX: Direct route back to main terminal */}
        <Button 
          variant="outline" 
          onClick={() => setLocation("/")}
          className="font-mono flex items-center gap-2 border-primary/50 hover:bg-primary/10"
        >
          <ArrowLeft className="h-4 w-4" /> RETURN_TO_TERMINAL
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-primary/20 bg-card/50"><CardHeader className="pb-2"><CardTitle className="text-sm">Total Ops</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats?.totalUsers || 0}</div></CardContent></Card>
        <Card className="border-primary/20 bg-card/50"><CardHeader className="pb-2"><CardTitle className="text-sm">MRR</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">${stats?.mrr || 0}</div></CardContent></Card>
        <Card className="border-primary/20 bg-card/50"><CardHeader className="pb-2"><CardTitle className="text-sm">Conv %</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats?.conversionRate || 0}%</div></CardContent></Card>
        <Card className="border-primary/20 bg-card/50"><CardHeader className="pb-2"><CardTitle className="text-sm">AI Accuracy</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats?.aiWinRate || 0}%</div></CardContent></Card>
      </div>

      <Card className="border-primary/20 bg-card/50">
        <CardHeader><CardTitle className="text-xl font-mono flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />OPERATIVE_REGISTRY</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr><th className="p-3 text-left">Email</th><th className="p-3 text-left">Clearance</th><th className="p-3 text-left">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats?.users.map((op) => (
                  <tr key={op.id}>
                    <td className="p-3 font-mono">{op.email}</td>
                    <td className="p-3 uppercase font-bold text-[10px]">{op.tier}</td>
                    <td className="p-3">
                      {/* TABLE LOGIC FIX: Explicit Boolean Check */}
                      {String(op.is_premium) === "true" ? (
                        <span className="bg-green-500/10 text-green-500 px-2 py-1 rounded-full text-[10px] font-bold">PREMIUM</span>
                      ) : (
                        <span className="bg-slate-500/10 text-slate-500 px-2 py-1 rounded-full text-[10px] font-bold">STANDARD</span>
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

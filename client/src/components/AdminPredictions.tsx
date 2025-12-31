import { useQuery } from "@tanstack/react-query";
import { Target, ShieldCheck, LayoutDashboard, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import Skeleton from "@/components/Skeleton";

interface Prediction {
  id: string;
  ticker: string;
  signal: string;
  entryPrice: number;
  predictedPrice?: number;
  outcome?: string;
  outcomePrice?: number;
  predictionDate: string;
  confidence?: string;
  confidenceScore?: number;
}

interface PredictionsResponse {
  success: boolean;
  data: Prediction[];
}

export default function AdminPredictions() {
  const [, setLocation] = useLocation();
  const { data, isLoading, error } = useQuery<PredictionsResponse>({
    queryKey: ["/api/predictions"],
  });

  if (isLoading) return <div className="p-8"><Skeleton className="h-[400px] w-full" /></div>;
  if (error) return <div className="p-8 text-red-500 font-mono">ERROR: Failed to load predictions</div>;

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
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
          >
            <LayoutDashboard className="h-5 w-5" />
            <span className="font-medium">Dashboard</span>
          </button>
          <button
            onClick={() => setLocation("/admin/predictions")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 transition-all"
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

      <div className="ml-64 flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight text-foreground font-mono flex items-center gap-2">
            <Target className="h-8 w-8 text-primary" />
            PREDICTIONS_REGISTRY
          </h2>
        </div>

      <Card className="border-primary/20 bg-card/50">
        <CardHeader>
          <CardTitle className="text-xl font-mono">
            Total Predictions: {data?.data?.length || 0}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border max-h-[600px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border sticky top-0">
                <tr>
                  <th className="p-3 text-left font-medium">Ticker</th>
                  <th className="p-3 text-left font-medium">Signal</th>
                  <th className="p-3 text-left font-medium">Entry Price</th>
                  <th className="p-3 text-left font-medium">Predicted Price</th>
                  <th className="p-3 text-left font-medium">Outcome</th>
                  <th className="p-3 text-left font-medium">Outcome Price</th>
                  <th className="p-3 text-left font-medium">Date</th>
                  <th className="p-3 text-left font-medium">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data?.data?.map((pred) => (
                  <tr key={pred.id}>
                    <td className="p-3 font-mono font-bold">{pred.ticker}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        pred.signal === 'BUY' ? 'bg-green-500/20 text-green-500' : 
                        pred.signal === 'SELL' ? 'bg-red-500/20 text-red-500' : 
                        'bg-slate-500/20 text-slate-500'
                      }`}>
                        {pred.signal}
                      </span>
                    </td>
                    <td className="p-3 font-mono">${pred.entryPrice.toFixed(2)}</td>
                    <td className="p-3 font-mono">
                      {pred.predictedPrice ? `$${pred.predictedPrice.toFixed(2)}` : '-'}
                    </td>
                    <td className="p-3">
                      {pred.outcome ? (
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          pred.outcome === 'win' ? 'bg-green-500/20 text-green-500' : 
                          pred.outcome === 'loss' ? 'bg-red-500/20 text-red-500' : 
                          'bg-yellow-500/20 text-yellow-500'
                        }`}>
                          {pred.outcome.toUpperCase()}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">PENDING</span>
                      )}
                    </td>
                    <td className="p-3 font-mono">
                      {pred.outcomePrice ? `$${pred.outcomePrice.toFixed(2)}` : '-'}
                    </td>
                    <td className="p-3 text-xs text-slate-400">
                      {new Date(pred.predictionDate).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      {pred.confidenceScore ? (
                        <span className="text-xs font-bold">{pred.confidenceScore.toFixed(1)}%</span>
                      ) : pred.confidence ? (
                        <span className="text-xs">{pred.confidence}</span>
                      ) : (
                        <span className="text-slate-500 text-xs">-</span>
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
    </div>
  );
}


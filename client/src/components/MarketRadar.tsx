import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, TrendingUp, TrendingDown, Activity } from "lucide-react";

interface SentinelResult {
  ticker: string;
  price: number;
  changePercent: number;
  rsi: number;
  rvol: number;
  sentimentScore: number;
  verdict: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  signal: 'MOMENTUM BUY' | 'VALUE BUY' | 'SELL WARNING' | 'WAIT';
}

interface SentinelData {
  count: number;
  timestamp: string;
  data: SentinelResult[];
}

async function fetchSentinelScan(): Promise<SentinelData> {
  const res = await fetch("/api/market/sentinel");
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json;
}

export function MarketRadar() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["sentinel-scan"],
    queryFn: fetchSentinelScan,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
    enabled: false,
  });

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'MOMENTUM BUY': return 'bg-green-600';
      case 'VALUE BUY': return 'bg-blue-600';
      case 'SELL WARNING': return 'bg-orange-600';
      default: return 'bg-gray-500';
    }
  };

  const getVerdictIcon = (verdict: string) => {
    switch (verdict) {
      case 'BULLISH': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'BEARISH': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            🛡️ Market Radar
          </CardTitle>
          <Button
            onClick={() => refetch()}
            disabled={isLoading || isFetching}
            size="sm"
            variant="outline"
            className="gap-2"
            data-testid="button-radar-scan"
          >
            {(isLoading || isFetching) ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Scan
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Real-time analysis: RSI, Volume, Sentiment
        </p>
      </CardHeader>
      <CardContent>
        {(isLoading || isFetching) ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Scanning...</span>
          </div>
        ) : data?.data && data.data.length > 0 ? (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground mb-3">
              {data.count} stocks • {new Date(data.timestamp).toLocaleTimeString()}
            </div>
            {data.data.map((stock) => (
              <div
                key={stock.ticker}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                data-testid={`radar-item-${stock.ticker}`}
              >
                <div className="flex items-center gap-3">
                  {getVerdictIcon(stock.verdict)}
                  <div>
                    <a
                      href={`/api/go/${stock.ticker}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-primary hover:underline"
                    >
                      {stock.ticker}
                    </a>
                    <span className="ml-2 text-sm text-muted-foreground">
                      ${stock.price.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground">
                    RSI {stock.rsi}
                  </span>
                  <Badge className={`text-xs ${getSignalColor(stock.signal)}`}>
                    {stock.signal}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground">Click Scan to analyze market</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default MarketRadar;

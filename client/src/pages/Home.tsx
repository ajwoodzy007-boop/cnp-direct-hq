import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { StreamlitLayout } from "@/components/streamlit/layout";
import {
  StTitle,
  StHeader,
  StSubheader,
  StText,
  StMetric,
  StSelect,
} from "@/components/streamlit/widgets";
import { Loader2, RefreshCw, ExternalLink, Info, History, TrendingUp, TrendingDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid } from "recharts";

// Types matching backend response
interface StockData {
  ticker: string;
  price: number;
  changePercent: number;
  rvol: number;
  rsi: number;
  sentiment: "🟢 BULLISH" | "🔴 BEARISH" | "⚪ NEUTRAL" | "⚪ NO NEWS";
  sentimentScore: number;
}

interface ChartDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface NewsItem {
  title: string;
  url: string;
  sentiment: "positive" | "neutral" | "negative";
  publishedAt: string;
}

interface Prediction {
  id: string;
  ticker: string;
  signalType: string;
  entryPrice: number;
  predictionDate: string;
  outcome: string | null;
  outcomePrice: number | null;
  outcomeDate: string | null;
}

// API calls
async function fetchMarketScan(): Promise<StockData[]> {
  const res = await fetch("/api/market/scan");
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

async function fetchChartData(ticker: string, period: string = "3m"): Promise<ChartDataPoint[]> {
  const res = await fetch(`/api/market/chart/${ticker}?period=${period}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

async function fetchNews(ticker: string): Promise<NewsItem[]> {
  const res = await fetch(`/api/market/news/${ticker}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

async function fetchPredictions(): Promise<Prediction[]> {
  const res = await fetch("/api/predictions");
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

async function createPrediction(data: { ticker: string; signalType: string; entryPrice: number }): Promise<Prediction> {
  const res = await fetch("/api/predictions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

async function updatePredictionOutcome(id: string, outcome: string, outcomePrice: number): Promise<Prediction> {
  const res = await fetch(`/api/predictions/${id}/outcome`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ outcome, outcomePrice }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

export default function Home() {
  const queryClient = useQueryClient();
  const [selectedTicker, setSelectedTicker] = useState<string>("NVDA");
  const [outcomeInputs, setOutcomeInputs] = useState<Record<string, { price: string; outcome: string }>>({});

  // Fetch market data with React Query
  const { data: marketData = [], isLoading, refetch } = useQuery({
    queryKey: ["market-scan"],
    queryFn: fetchMarketScan,
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });

  // Fetch chart data for selected ticker
  const { data: chartData = [] } = useQuery({
    queryKey: ["chart", selectedTicker],
    queryFn: () => fetchChartData(selectedTicker),
    enabled: !!selectedTicker,
  });

  // Fetch news for selected ticker
  const { data: newsData = [] } = useQuery({
    queryKey: ["news", selectedTicker],
    queryFn: () => fetchNews(selectedTicker),
    enabled: !!selectedTicker,
  });

  // Fetch predictions
  const { data: predictionsData = [] } = useQuery({
    queryKey: ["predictions"],
    queryFn: fetchPredictions,
  });

  // Create prediction mutation
  const createPredictionMutation = useMutation({
    mutationFn: createPrediction,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["predictions"] }),
  });

  // Update prediction outcome mutation
  const updateOutcomeMutation = useMutation({
    mutationFn: ({ id, outcome, outcomePrice }: { id: string; outcome: string; outcomePrice: number }) =>
      updatePredictionOutcome(id, outcome, outcomePrice),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["predictions"] }),
  });

  // Handler to log a prediction from a stock row
  const handleLogPrediction = (stock: StockData, signalType: string) => {
    createPredictionMutation.mutate({
      ticker: stock.ticker,
      signalType,
      entryPrice: stock.price,
    });
  };

  // Handler to update prediction outcome
  const handleUpdateOutcome = (id: string) => {
    const input = outcomeInputs[id];
    if (!input || !input.price || !input.outcome) return;
    updateOutcomeMutation.mutate({ id, outcome: input.outcome, outcomePrice: parseFloat(input.price) });
    setOutcomeInputs((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  // Calculate prediction stats
  const predictionStats = useMemo(() => {
    const completed = predictionsData.filter((p) => p.outcome);
    const wins = completed.filter((p) => p.outcome === "win").length;
    const losses = completed.filter((p) => p.outcome === "loss").length;
    const winRate = completed.length > 0 ? ((wins / completed.length) * 100).toFixed(1) : "0";
    return { total: predictionsData.length, completed: completed.length, wins, losses, winRate };
  }, [predictionsData]);

  // Derived state for tables - always show top 10 by change percent
  const gainers = useMemo(
    () => [...marketData].sort((a, b) => b.changePercent - a.changePercent).slice(0, 10),
    [marketData]
  );

  const losers = useMemo(
    () => [...marketData].filter((d) => d.changePercent < 0).sort((a, b) => a.changePercent - b.changePercent),
    [marketData]
  );

  const allTickers = useMemo(() => marketData.map((d) => d.ticker), [marketData]);

  // Update selected ticker when data loads
  useEffect(() => {
    if (allTickers.length > 0 && !allTickers.includes(selectedTicker)) {
      setSelectedTicker(allTickers[0]);
    }
  }, [allTickers, selectedTicker]);

  // Format chart data for Recharts
  const formattedChartData = useMemo(
    () => chartData.map((d) => ({ date: d.date, price: d.close })),
    [chartData]
  );

  // Time ago formatter
  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffHours > 24) return `${Math.floor(diffHours / 24)}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return `${diffMins}m ago`;
  };

  // Sidebar UI
  const SidebarContent = (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Scanner Settings</h3>
        <Button
          onClick={() => refetch()}
          disabled={isLoading}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          data-testid="button-refresh"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scanning...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh Data
            </>
          )}
        </Button>
      </div>

      <div className="rounded-lg bg-card border border-border p-4 text-sm space-y-3">
        <h4 className="font-semibold text-foreground">Legend</h4>
        <div className="flex items-start gap-2">
          <span className="text-xl">🚀</span>
          <div>
            <span className="font-medium text-foreground flex items-center gap-1">
              Rocket Ship
              <Popover>
                <PopoverTrigger className="cursor-pointer"><Info className="h-3 w-3 text-muted-foreground hover:text-foreground" /></PopoverTrigger>
                <PopoverContent className="text-sm">Stocks with unusually high trading volume (3x+ normal) combined with positive news sentiment. These often indicate strong momentum and potential breakout opportunities.</PopoverContent>
              </Popover>
            </span>
            <p className="text-xs text-muted-foreground">High RVol ({">"}3x) + Bullish News</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-xl">💎</span>
          <div>
            <span className="font-medium text-foreground flex items-center gap-1">
              Diamond in Rough
              <Popover>
                <PopoverTrigger className="cursor-pointer"><Info className="h-3 w-3 text-muted-foreground hover:text-foreground" /></PopoverTrigger>
                <PopoverContent className="text-sm">Oversold stocks (RSI below 30) with positive news sentiment. These may represent undervalued buying opportunities where the market hasn't yet priced in the good news.</PopoverContent>
              </Popover>
            </span>
            <p className="text-xs text-muted-foreground">Low RSI ({'<'}30) + Bullish News</p>
          </div>
        </div>
      </div>

      {/* Prediction History */}
      <div className="rounded-lg bg-card border border-border p-4 text-sm space-y-4">
        <h4 className="font-semibold text-foreground flex items-center gap-2">
          <History className="h-4 w-4" />
          Prediction History
        </h4>
        
        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-muted/50 rounded p-2 text-center">
            <p className="text-lg font-bold">{predictionStats.total}</p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </div>
          <div className="bg-muted/50 rounded p-2 text-center">
            <p className="text-lg font-bold">{predictionStats.winRate}%</p>
            <p className="text-[10px] text-muted-foreground">Win Rate</p>
          </div>
          <div className="bg-green-500/10 rounded p-2 text-center">
            <p className="text-lg font-bold text-green-600">{predictionStats.wins}</p>
            <p className="text-[10px] text-muted-foreground">Wins</p>
          </div>
          <div className="bg-red-500/10 rounded p-2 text-center">
            <p className="text-lg font-bold text-red-600">{predictionStats.losses}</p>
            <p className="text-[10px] text-muted-foreground">Losses</p>
          </div>
        </div>

        {/* Recent Predictions */}
        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">Recent Predictions</p>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {predictionsData.slice(0, 10).map((pred) => (
              <div key={pred.id} className="flex items-center justify-between text-xs bg-muted/30 rounded p-2" data-testid={`sidebar-prediction-${pred.id}`}>
                <div>
                  <span className="font-bold">{pred.ticker}</span>
                  <span className="text-muted-foreground ml-1">${pred.entryPrice.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {pred.outcome ? (
                    <Badge className={`text-[10px] ${pred.outcome === "win" ? "bg-green-600" : "bg-red-600"}`}>
                      {pred.outcome.toUpperCase()}
                    </Badge>
                  ) : (
                    <>
                      <Input
                        type="number"
                        placeholder="Exit $"
                        className="h-6 w-14 text-[10px]"
                        value={outcomeInputs[pred.id]?.price || ""}
                        onChange={(e) =>
                          setOutcomeInputs((prev) => ({
                            ...prev,
                            [pred.id]: { ...prev[pred.id], price: e.target.value },
                          }))
                        }
                        data-testid={`sidebar-input-exit-${pred.id}`}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-green-600 hover:bg-green-50"
                        onClick={() => {
                          setOutcomeInputs((prev) => ({ ...prev, [pred.id]: { ...prev[pred.id], outcome: "win" } }));
                          setTimeout(() => handleUpdateOutcome(pred.id), 0);
                        }}
                        disabled={!outcomeInputs[pred.id]?.price}
                        data-testid={`sidebar-button-win-${pred.id}`}
                      >
                        <TrendingUp className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                        onClick={() => {
                          setOutcomeInputs((prev) => ({ ...prev, [pred.id]: { ...prev[pred.id], outcome: "loss" } }));
                          setTimeout(() => handleUpdateOutcome(pred.id), 0);
                        }}
                        disabled={!outcomeInputs[pred.id]?.price}
                        data-testid={`sidebar-button-loss-${pred.id}`}
                      >
                        <TrendingDown className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {predictionsData.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                No predictions yet. Log picks from the Top Gainers table!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <StreamlitLayout sidebar={SidebarContent}>
      <StTitle>⚡ Pro Trader's Dashboard</StTitle>

      <StText>
        Real-time market scanner powered by AI sentiment analysis. Identify breakout candidates and oversold
        opportunities instantly.
      </StText>

      {/* --- GAINERS SECTION --- */}
      <div className="mt-8">
        <StHeader>📈 Top Gainers</StHeader>
        <div className="rounded-md border border-border overflow-hidden my-4 bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground font-mono uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 font-medium">
                    <Popover><PopoverTrigger className="flex items-center gap-1 cursor-pointer">Ticker <Info className="h-3 w-3" /></PopoverTrigger><PopoverContent className="text-sm">Stock symbol used to identify the company</PopoverContent></Popover>
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <Popover><PopoverTrigger className="flex items-center gap-1 cursor-pointer">Price <Info className="h-3 w-3" /></PopoverTrigger><PopoverContent className="text-sm">Current trading price in USD</PopoverContent></Popover>
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <Popover><PopoverTrigger className="flex items-center gap-1 cursor-pointer">Change % <Info className="h-3 w-3" /></PopoverTrigger><PopoverContent className="text-sm">Percentage change from previous close</PopoverContent></Popover>
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <Popover><PopoverTrigger className="flex items-center gap-1 cursor-pointer">RVol <Info className="h-3 w-3" /></PopoverTrigger><PopoverContent className="text-sm">Relative Volume: 1.0 is normal, 3.0+ indicates high interest</PopoverContent></Popover>
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <Popover><PopoverTrigger className="flex items-center gap-1 cursor-pointer">RSI <Info className="h-3 w-3" /></PopoverTrigger><PopoverContent className="text-sm">Relative Strength Index: below 30 = oversold, above 70 = overbought</PopoverContent></Popover>
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <Popover><PopoverTrigger className="flex items-center gap-1 cursor-pointer">AI Verdict <Info className="h-3 w-3" /></PopoverTrigger><PopoverContent className="text-sm">Sentiment analysis based on recent news headlines</PopoverContent></Popover>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono">
                {gainers.map((row) => (
                  <tr key={row.ticker} className="hover:bg-muted/30 transition-colors" data-testid={`row-gainer-${row.ticker}`}>
                    <td className="px-4 py-2 font-bold">
                      <a 
                        href={`https://finance.yahoo.com/quote/${row.ticker}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {row.ticker}
                      </a>
                    </td>
                    <td className="px-4 py-2" data-testid={`text-price-${row.ticker}`}>${row.price.toFixed(2)}</td>
                    <td className="px-4 py-2 text-green-600 dark:text-green-400">+{row.changePercent.toFixed(2)}%</td>
                    <td className="px-4 py-2">
                      {row.rvol.toFixed(1)}x
                      {row.rvol > 3 && <span className="ml-1">🚀</span>}
                    </td>
                    <td className="px-4 py-2">
                      {row.rsi}
                      {row.rsi < 30 && row.sentiment === "🟢 BULLISH" && <span className="ml-1">💎</span>}
                      {row.rsi > 70 && <span className="ml-1">⚠️</span>}
                    </td>
                    <td className="px-4 py-2">{row.sentiment}</td>
                  </tr>
                ))}
                {gainers.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No gainers found.
                    </td>
                  </tr>
                )}
                {isLoading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- LOSERS SECTION --- */}
      <div className="mt-8">
        <StHeader>📉 Top Losers (Dip Watch)</StHeader>
        <div className="rounded-md border border-border overflow-hidden my-4 bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground font-mono uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 font-medium">
                    <Popover><PopoverTrigger className="flex items-center gap-1 cursor-pointer">Ticker <Info className="h-3 w-3" /></PopoverTrigger><PopoverContent className="text-sm">Stock symbol used to identify the company</PopoverContent></Popover>
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <Popover><PopoverTrigger className="flex items-center gap-1 cursor-pointer">Price <Info className="h-3 w-3" /></PopoverTrigger><PopoverContent className="text-sm">Current trading price in USD</PopoverContent></Popover>
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <Popover><PopoverTrigger className="flex items-center gap-1 cursor-pointer">Change % <Info className="h-3 w-3" /></PopoverTrigger><PopoverContent className="text-sm">Percentage change from previous close</PopoverContent></Popover>
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <Popover><PopoverTrigger className="flex items-center gap-1 cursor-pointer">RVol <Info className="h-3 w-3" /></PopoverTrigger><PopoverContent className="text-sm">Relative Volume: 1.0 is normal, 3.0+ indicates high interest</PopoverContent></Popover>
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <Popover><PopoverTrigger className="flex items-center gap-1 cursor-pointer">RSI <Info className="h-3 w-3" /></PopoverTrigger><PopoverContent className="text-sm">Relative Strength Index: below 30 = oversold, above 70 = overbought</PopoverContent></Popover>
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <Popover><PopoverTrigger className="flex items-center gap-1 cursor-pointer">AI Verdict <Info className="h-3 w-3" /></PopoverTrigger><PopoverContent className="text-sm">Sentiment analysis based on recent news headlines</PopoverContent></Popover>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono">
                {losers.map((row) => (
                  <tr key={row.ticker} className="hover:bg-muted/30 transition-colors" data-testid={`row-loser-${row.ticker}`}>
                    <td className="px-4 py-2 font-bold">
                      <a 
                        href={`https://finance.yahoo.com/quote/${row.ticker}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {row.ticker}
                      </a>
                    </td>
                    <td className="px-4 py-2">${row.price.toFixed(2)}</td>
                    <td className="px-4 py-2 text-red-600 dark:text-red-400">{row.changePercent.toFixed(2)}%</td>
                    <td className="px-4 py-2">{row.rvol.toFixed(1)}x</td>
                    <td className="px-4 py-2">
                      {row.rsi}
                      {row.rsi < 30 && <span className="ml-1">💎</span>}
                    </td>
                    <td className="px-4 py-2">{row.sentiment}</td>
                  </tr>
                ))}
                {losers.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No losers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- DEEP DIVE SECTION --- */}
      <div className="mt-12 border-t border-border pt-8">
        <StHeader>🔍 Deep Dive</StHeader>

        <div className="mb-6">
          <StSelect
            label="Select a Stock to Chart:"
            options={allTickers}
            value={selectedTicker}
            onChange={setSelectedTicker}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chart Area */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>{selectedTicker} - 3 Month Chart</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={formattedChartData}>
                      <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis
                        dataKey="date"
                        stroke="var(--muted-foreground)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={30}
                      />
                      <YAxis
                        stroke="var(--muted-foreground)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        domain={["auto", "auto"]}
                        tickFormatter={(val) => `$${val.toFixed(0)}`}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "var(--popover)",
                          borderColor: "var(--border)",
                          borderRadius: "var(--radius)",
                          color: "var(--popover-foreground)",
                        }}
                        formatter={(val: number) => [`$${val.toFixed(2)}`, "Price"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke="var(--primary)"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorPrice)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* News Area */}
          <div>
            <StSubheader>Latest News for {selectedTicker}</StSubheader>
            <div className="space-y-4 mt-4">
              {newsData.map((news, idx) => (
                <div
                  key={idx}
                  className="group relative rounded-lg border border-border bg-card p-4 hover:bg-muted/50 transition-colors"
                  data-testid={`card-news-${idx}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h5 className="font-medium text-sm leading-tight group-hover:underline decoration-primary/50 underline-offset-4">
                      {news.title}
                    </h5>
                    <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-mono uppercase">
                      {news.sentiment}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{timeAgo(news.publishedAt)}</span>
                  </div>
                  <a href={news.url} className="absolute inset-0" aria-label={`Read ${news.title}`}></a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </StreamlitLayout>
  );
}

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
import { Loader2, RefreshCw, ExternalLink, Info, History, TrendingUp, TrendingDown, X, ChevronRight, Star, Plus, BarChart3, Sparkles, Lightbulb, Crown, Share2 } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AdBanner, AdSidebar } from "@/components/AdBanner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Area, AreaChart, Line, LineChart, Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, ReferenceLine } from "recharts";

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

interface WatchlistItem {
  id: string;
  ticker: string;
  addedAt: string;
}

interface AIPlaybook {
  summary: string;
  insights: string[];
  recommendation: string;
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

async function fetchWatchlist(): Promise<WatchlistItem[]> {
  const res = await fetch("/api/watchlist");
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

async function addToWatchlist(ticker: string): Promise<WatchlistItem> {
  const res = await fetch("/api/watchlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticker }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

async function removeFromWatchlist(ticker: string): Promise<void> {
  const res = await fetch(`/api/watchlist/${ticker}`, {
    method: "DELETE",
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
}

async function generateAIPlaybook(marketSummary?: string): Promise<AIPlaybook> {
  const res = await fetch("/api/ai/playbook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ marketSummary }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

export default function Home() {
  const queryClient = useQueryClient();
  const [selectedTicker, setSelectedTicker] = useState<string>("NVDA");
  const [outcomeInputs, setOutcomeInputs] = useState<Record<string, { price: string; outcome: string }>>({});
  const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [autoLoggedTickers, setAutoLoggedTickers] = useState<Set<string>>(new Set());
  const [historyFilter, setHistoryFilter] = useState<"all" | "win" | "loss">("all");
  const [manualTicker, setManualTicker] = useState("");
  const [manualSignal, setManualSignal] = useState("Manual");
  const [watchlistInput, setWatchlistInput] = useState("");

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["predictions"] });
    },
    onError: (error) => {
      toast.error("Failed to add prediction", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  // Update prediction outcome mutation
  const updateOutcomeMutation = useMutation({
    mutationFn: ({ id, outcome, outcomePrice }: { id: string; outcome: string; outcomePrice: number }) =>
      updatePredictionOutcome(id, outcome, outcomePrice),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["predictions"] }),
  });

  // Fetch watchlist
  const { data: watchlistData = [] } = useQuery({
    queryKey: ["watchlist"],
    queryFn: fetchWatchlist,
  });

  // Add to watchlist mutation
  const addWatchlistMutation = useMutation({
    mutationFn: addToWatchlist,
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
      toast.success(`Added ${item.ticker} to watchlist`);
    },
    onError: (error) => {
      toast.error("Failed to add to watchlist", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  // Remove from watchlist mutation
  const removeWatchlistMutation = useMutation({
    mutationFn: removeFromWatchlist,
    onSuccess: (_, ticker) => {
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
      toast.success(`Removed ${ticker} from watchlist`);
    },
    onError: (error) => {
      toast.error("Failed to remove from watchlist", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  // Get watchlist stocks with current prices
  const watchlistWithPrices = useMemo(() => {
    return watchlistData.map(item => {
      const stock = marketData.find(s => s.ticker === item.ticker);
      return {
        ...item,
        price: stock?.price,
        changePercent: stock?.changePercent,
        sentiment: stock?.sentiment,
      };
    });
  }, [watchlistData, marketData]);

  // AI Playbook mutation
  const aiPlaybookMutation = useMutation({
    mutationFn: generateAIPlaybook,
    onError: (error) => {
      toast.error("Failed to generate AI insights", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    },
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

  // Calculate performance data over time for charts
  const performanceData = useMemo(() => {
    const completedPredictions = predictionsData
      .filter((p) => p.outcome && p.outcomeDate)
      .sort((a, b) => new Date(a.outcomeDate!).getTime() - new Date(b.outcomeDate!).getTime());
    
    if (completedPredictions.length === 0) return [];

    let cumulativeWins = 0;
    let cumulativeLosses = 0;
    let cumulativePL = 0;

    return completedPredictions.map((pred, index) => {
      if (pred.outcome === "win") cumulativeWins++;
      else cumulativeLosses++;
      
      const plPercent = pred.outcomePrice && pred.entryPrice 
        ? ((pred.outcomePrice - pred.entryPrice) / pred.entryPrice) * 100 
        : 0;
      cumulativePL += plPercent;
      
      const total = cumulativeWins + cumulativeLosses;
      const winRate = total > 0 ? (cumulativeWins / total) * 100 : 0;
      
      const date = new Date(pred.outcomeDate!);
      const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
      
      return {
        date: dateStr,
        trade: index + 1,
        winRate: parseFloat(winRate.toFixed(1)),
        cumulativePL: parseFloat(cumulativePL.toFixed(2)),
        ticker: pred.ticker,
        outcome: pred.outcome,
      };
    });
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

  // Suggested stocks - rocket ships and diamonds not yet logged today
  const suggestedStocks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaysPredictions = predictionsData.filter(p => p.predictionDate.startsWith(today));
    const alreadyLoggedToday = new Set(todaysPredictions.map(p => `${p.ticker}-${p.signalType}`));
    
    const suggestions: { stock: StockData; signalType: string; icon: string }[] = [];
    
    marketData.forEach((stock) => {
      const isRocketShip = stock.rvol > 3 && stock.sentiment === "🟢 BULLISH";
      const isDiamond = stock.rsi < 30 && stock.sentiment === "🟢 BULLISH";
      
      if (isRocketShip && !alreadyLoggedToday.has(`${stock.ticker}-Rocket Ship`)) {
        suggestions.push({ stock, signalType: "Rocket Ship", icon: "🚀" });
      }
      if (isDiamond && !alreadyLoggedToday.has(`${stock.ticker}-Diamond`)) {
        suggestions.push({ stock, signalType: "Diamond", icon: "💎" });
      }
    });
    
    // Also add top 3 gainers with bullish sentiment as "Momentum" picks
    const topGainers = [...marketData]
      .filter(s => s.changePercent > 2 && s.sentiment === "🟢 BULLISH")
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, 3);
    
    topGainers.forEach((stock) => {
      if (!alreadyLoggedToday.has(`${stock.ticker}-Momentum`) && !suggestions.find(s => s.stock.ticker === stock.ticker)) {
        suggestions.push({ stock, signalType: "Momentum", icon: "📈" });
      }
    });
    
    return suggestions.slice(0, 5);
  }, [marketData, predictionsData]);

  // Handler to manually add a stock
  const handleManualAdd = () => {
    if (!manualTicker.trim()) return;
    const stock = marketData.find(s => s.ticker.toUpperCase() === manualTicker.toUpperCase().trim());
    if (stock) {
      createPredictionMutation.mutate({
        ticker: stock.ticker,
        signalType: manualSignal,
        entryPrice: stock.price,
      });
      toast.success(`Added ${stock.ticker}`, {
        description: `${manualSignal} signal at $${stock.price.toFixed(2)}`,
      });
    } else {
      toast.error(`Ticker not found`, {
        description: `${manualTicker.toUpperCase()} is not in the scanner. Try refreshing.`,
      });
    }
    setManualTicker("");
  };

  // Update selected ticker when data loads
  useEffect(() => {
    if (allTickers.length > 0 && !allTickers.includes(selectedTicker)) {
      setSelectedTicker(allTickers[0]);
    }
  }, [allTickers, selectedTicker]);

  // Auto-log rocket ships and diamonds
  useEffect(() => {
    if (marketData.length === 0 || predictionsData === undefined) return;
    
    const today = new Date().toISOString().split('T')[0];
    const todaysPredictions = predictionsData.filter(p => p.predictionDate.startsWith(today));
    const alreadyLoggedToday = new Set(todaysPredictions.map(p => `${p.ticker}-${p.signalType}`));
    
    marketData.forEach((stock) => {
      const isRocketShip = stock.rvol > 3 && stock.sentiment === "🟢 BULLISH";
      const isDiamond = stock.rsi < 30 && stock.sentiment === "🟢 BULLISH";
      
      if (isRocketShip) {
        const key = `${stock.ticker}-Rocket Ship`;
        if (!alreadyLoggedToday.has(key) && !autoLoggedTickers.has(key)) {
          setAutoLoggedTickers(prev => new Set(Array.from(prev).concat(key)));
          createPredictionMutation.mutate({
            ticker: stock.ticker,
            signalType: "Rocket Ship",
            entryPrice: stock.price,
          });
          toast.success(`🚀 Rocket Ship Detected!`, {
            description: `${stock.ticker} at $${stock.price.toFixed(2)} - High volume + bullish sentiment`,
            duration: 5000,
          });
        }
      }
      
      if (isDiamond) {
        const key = `${stock.ticker}-Diamond`;
        if (!alreadyLoggedToday.has(key) && !autoLoggedTickers.has(key)) {
          setAutoLoggedTickers(prev => new Set(Array.from(prev).concat(key)));
          createPredictionMutation.mutate({
            ticker: stock.ticker,
            signalType: "Diamond",
            entryPrice: stock.price,
          });
          toast.success(`💎 Diamond in the Rough!`, {
            description: `${stock.ticker} at $${stock.price.toFixed(2)} - Oversold + bullish sentiment`,
            duration: 5000,
          });
        }
      }
    });
  }, [marketData, predictionsData, autoLoggedTickers, createPredictionMutation]);

  // Auto-update outcomes at market close (or when market data updates after close)
  // For simplicity, we'll check on each market data update if current price differs from entry
  const [processedOutcomes, setProcessedOutcomes] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    if (marketData.length === 0 || predictionsData.length === 0) return;
    
    // Check if market is closed (after 4 PM ET on weekdays)
    const now = new Date();
    const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const hour = etTime.getHours();
    const day = etTime.getDay();
    const isWeekend = day === 0 || day === 6;
    const isAfterMarketClose = hour >= 16;
    
    // Only auto-process outcomes after market close or on weekends
    if (!isAfterMarketClose && !isWeekend) return;
    
    // Get pending predictions that were created today or earlier
    const pendingPredictions = predictionsData.filter(p => !p.outcome && !processedOutcomes.has(p.id));
    
    pendingPredictions.forEach((prediction) => {
      const currentStock = marketData.find(s => s.ticker === prediction.ticker);
      if (!currentStock) return;
      
      // Determine outcome based on price change
      const outcome = currentStock.price >= prediction.entryPrice ? "win" : "loss";
      const pctChange = ((currentStock.price - prediction.entryPrice) / prediction.entryPrice * 100).toFixed(2);
      
      // Update outcome - only mark as processed on success
      updateOutcomeMutation.mutate({
        id: prediction.id,
        outcome,
        outcomePrice: currentStock.price,
      }, {
        onSuccess: () => {
          // Mark as processed only after successful update
          setProcessedOutcomes(prev => new Set(Array.from(prev).concat(prediction.id)));
          const emoji = outcome === "win" ? "🎉" : "📉";
          toast.info(`${emoji} ${prediction.ticker} marked as ${outcome.toUpperCase()}`, {
            description: `Entry: $${prediction.entryPrice.toFixed(2)} → Close: $${currentStock.price.toFixed(2)} (${pctChange}%)`,
          });
        },
        onError: (error) => {
          toast.error(`Failed to update ${prediction.ticker} outcome`, {
            description: error instanceof Error ? error.message : "Will retry on next refresh",
          });
        }
      });
    });
  }, [marketData, predictionsData, processedOutcomes, updateOutcomeMutation]);

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

  // Share winning trade on social media
  const handleShareWin = (pred: Prediction, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    const gainPercent = pred.outcomePrice && pred.entryPrice 
      ? ((pred.outcomePrice - pred.entryPrice) / pred.entryPrice * 100).toFixed(1)
      : "0";
    const gainSign = parseFloat(gainPercent) >= 0 ? "+" : "";
    
    const tweetText = `🚀 Just called $${pred.ticker} correctly! ${gainSign}${gainPercent}% gain\n\nEntry: $${pred.entryPrice.toFixed(2)} → Exit: $${pred.outcomePrice?.toFixed(2)}\n\nTrack your trades with Pro Trader Dashboard 📈`;
    
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');
    
    toast.success("Share your win!", { description: "Twitter opened in new window" });
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

      {/* Watchlist */}
      <div className="rounded-lg bg-card border border-border p-4 text-sm space-y-3">
        <h4 className="font-semibold text-foreground flex items-center gap-2">
          <Star className="h-4 w-4" />
          My Watchlist
        </h4>
        
        {/* Add to watchlist input */}
        <div className="flex gap-2">
          <Input
            placeholder="Add ticker..."
            value={watchlistInput}
            onChange={(e) => setWatchlistInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && watchlistInput.trim()) {
                addWatchlistMutation.mutate(watchlistInput.trim());
                setWatchlistInput("");
              }
            }}
            className="h-8 text-xs"
            data-testid="input-watchlist-ticker"
          />
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2"
            onClick={() => {
              if (watchlistInput.trim()) {
                addWatchlistMutation.mutate(watchlistInput.trim());
                setWatchlistInput("");
              }
            }}
            disabled={!watchlistInput.trim() || addWatchlistMutation.isPending}
            data-testid="button-add-watchlist"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Watchlist items */}
        <div className="space-y-2">
          {watchlistWithPrices.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              No stocks in watchlist. Add one above!
            </p>
          ) : (
            watchlistWithPrices.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-xs bg-muted/30 rounded p-2 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setSelectedTicker(item.ticker)}
                data-testid={`watchlist-item-${item.ticker}`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold">{item.ticker}</span>
                  {item.price !== undefined && (
                    <span className="text-muted-foreground">${item.price.toFixed(2)}</span>
                  )}
                  {item.changePercent !== undefined && (
                    <span className={item.changePercent >= 0 ? "text-green-600" : "text-red-600"}>
                      {item.changePercent >= 0 ? "+" : ""}{item.changePercent.toFixed(2)}%
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-red-500/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeWatchlistMutation.mutate(item.ticker);
                  }}
                  data-testid={`button-remove-watchlist-${item.ticker}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* AI Playbook */}
      <div className="rounded-lg bg-card border border-border p-4 text-sm space-y-3">
        <h4 className="font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-yellow-500" />
          AI Playbook
        </h4>
        
        <Button
          size="sm"
          className="w-full"
          onClick={() => aiPlaybookMutation.mutate(undefined)}
          disabled={aiPlaybookMutation.isPending}
          data-testid="button-generate-insights"
        >
          {aiPlaybookMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-3 w-3" />
              Generate Insights
            </>
          )}
        </Button>

        {aiPlaybookMutation.data && (
          <div className="space-y-3 pt-2">
            <div className="bg-primary/5 rounded p-3">
              <p className="text-xs leading-relaxed">{aiPlaybookMutation.data.summary}</p>
            </div>
            
            {aiPlaybookMutation.data.insights.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Key Insights</p>
                {aiPlaybookMutation.data.insights.map((insight, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <Lightbulb className="h-3 w-3 mt-0.5 text-yellow-500 flex-shrink-0" />
                    <span>{insight}</span>
                  </div>
                ))}
              </div>
            )}
            
            <div className="bg-green-500/10 rounded p-3 border-l-2 border-green-500">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Recommendation</p>
              <p className="text-xs text-green-700 dark:text-green-400">{aiPlaybookMutation.data.recommendation}</p>
            </div>
          </div>
        )}

        {!aiPlaybookMutation.data && !aiPlaybookMutation.isPending && (
          <p className="text-xs text-muted-foreground text-center py-2">
            Click above to get AI-powered trading insights based on your performance.
          </p>
        )}
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
          <div 
            className="bg-green-500/10 rounded p-2 text-center cursor-pointer hover:bg-green-500/20 transition-colors"
            onClick={() => { setHistoryFilter("win"); setShowFullHistory(true); }}
            data-testid="button-view-wins"
          >
            <p className="text-lg font-bold text-green-600">{predictionStats.wins}</p>
            <p className="text-[10px] text-muted-foreground">Wins</p>
          </div>
          <div 
            className="bg-red-500/10 rounded p-2 text-center cursor-pointer hover:bg-red-500/20 transition-colors"
            onClick={() => { setHistoryFilter("loss"); setShowFullHistory(true); }}
            data-testid="button-view-losses"
          >
            <p className="text-lg font-bold text-red-600">{predictionStats.losses}</p>
            <p className="text-[10px] text-muted-foreground">Losses</p>
          </div>
        </div>

        {/* Recent Predictions - Last 5 */}
        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">Recent Predictions</p>
          <div className="space-y-2">
            {predictionsData.slice(0, 5).map((pred) => (
              <div 
                key={pred.id} 
                className="flex items-center justify-between text-xs bg-muted/30 rounded p-2 cursor-pointer hover:bg-muted/50 transition-colors" 
                onClick={() => setSelectedPrediction(pred)}
                data-testid={`sidebar-prediction-${pred.id}`}
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <span className="font-bold">{pred.ticker}</span>
                    <Badge variant="outline" className="text-[8px] px-1 py-0">{pred.signalType}</Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(pred.predictionDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {pred.outcome ? (
                    <>
                      <Badge className={`text-[10px] ${pred.outcome === "win" ? "bg-green-600" : "bg-red-600"}`}>
                        {pred.outcome.toUpperCase()}
                      </Badge>
                      {pred.outcome === "win" && (
                        <button
                          onClick={(e) => handleShareWin(pred, e)}
                          className="p-1 rounded hover:bg-green-500/20 text-green-600 transition-colors"
                          title="Share your win on Twitter"
                          data-testid={`button-share-${pred.id}`}
                        >
                          <Share2 className="h-3 w-3" />
                        </button>
                      )}
                    </>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">Pending</Badge>
                  )}
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                </div>
              </div>
            ))}
            {predictionsData.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                No predictions yet. Rocket ships and diamonds are auto-logged!
              </p>
            )}
          </div>
          
          {/* View All Link */}
          {predictionsData.length > 5 && (
            <Button
              variant="link"
              size="sm"
              className="w-full mt-2 text-xs"
              onClick={() => { setHistoryFilter("all"); setShowFullHistory(true); }}
              data-testid="button-view-all-history"
            >
              View All {predictionsData.length} Predictions
            </Button>
          )}
        </div>

        {/* Suggested Stocks */}
        {suggestedStocks.length > 0 && (
          <div className="pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Hot Picks (Click to Add)</p>
            <div className="space-y-1">
              {suggestedStocks.map((suggestion) => (
                <div
                  key={`${suggestion.stock.ticker}-${suggestion.signalType}`}
                  className="flex items-center justify-between text-xs bg-primary/5 rounded p-2 cursor-pointer hover:bg-primary/10 transition-colors"
                  onClick={() => {
                    handleLogPrediction(suggestion.stock, suggestion.signalType);
                    toast.success(`Added ${suggestion.stock.ticker}`, {
                      description: `${suggestion.signalType} at $${suggestion.stock.price.toFixed(2)}`,
                    });
                  }}
                  data-testid={`suggested-${suggestion.stock.ticker}-${suggestion.signalType}`}
                >
                  <div className="flex items-center gap-2">
                    <span>{suggestion.icon}</span>
                    <span className="font-bold">{suggestion.stock.ticker}</span>
                    <span className="text-muted-foreground">${suggestion.stock.price.toFixed(2)}</span>
                  </div>
                  <Badge variant="outline" className="text-[8px] px-1 py-0">{suggestion.signalType}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Performers Quick Add */}
        <div className="pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">Top Performers (Quick Add)</p>
          <div className="flex flex-wrap gap-1">
            {gainers.slice(0, 6).map((stock) => (
              <Button
                key={stock.ticker}
                variant="outline"
                size="sm"
                className="h-7 text-[10px] px-2"
                onClick={() => {
                  createPredictionMutation.mutate({
                    ticker: stock.ticker,
                    signalType: "Top Gainer",
                    entryPrice: stock.price,
                  }, {
                    onSuccess: () => {
                      toast.success(`Added ${stock.ticker}`, {
                        description: `Top Gainer at $${stock.price.toFixed(2)} (+${stock.changePercent.toFixed(1)}%)`,
                      });
                    }
                  });
                }}
                disabled={createPredictionMutation.isPending}
                data-testid={`quick-add-${stock.ticker}`}
              >
                {stock.ticker} <span className="text-green-600 ml-1">+{stock.changePercent.toFixed(1)}%</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Manual Add */}
        <div className="pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">Add Stock Manually</p>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="AAPL"
                value={manualTicker}
                onChange={(e) => setManualTicker(e.target.value.toUpperCase())}
                className="flex-1 h-8 text-xs"
                onKeyDown={(e) => e.key === "Enter" && handleManualAdd()}
                data-testid="input-manual-ticker"
              />
              <select
                value={manualSignal}
                onChange={(e) => setManualSignal(e.target.value)}
                className="h-8 text-xs rounded border border-input bg-background px-2"
                data-testid="select-manual-signal"
              >
                <option value="Manual">Manual</option>
                <option value="Bullish">Bullish</option>
                <option value="Bearish">Bearish</option>
                <option value="Swing">Swing</option>
              </select>
            </div>
            <Button
              size="sm"
              className="w-full h-8 text-xs"
              onClick={handleManualAdd}
              disabled={!manualTicker.trim() || createPredictionMutation.isPending}
              data-testid="button-add-manual"
            >
              Add to Tracker
            </Button>
          </div>
        </div>
      </div>

      {/* Upgrade Banner */}
      <div className="rounded-lg bg-gradient-to-r from-yellow-500/10 via-primary/10 to-purple-500/10 border border-primary/20 p-4 text-center">
        <Crown className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
        <h4 className="font-semibold text-sm mb-1">Upgrade to Pro</h4>
        <p className="text-xs text-muted-foreground mb-3">
          Unlock unlimited AI insights & predictions
        </p>
        <Link href="/pricing">
          <Button size="sm" className="w-full" data-testid="button-upgrade-sidebar">
            <Crown className="mr-2 h-3 w-3" />
            View Plans
          </Button>
        </Link>
      </div>

      {/* Sidebar Advertisement */}
      <AdSidebar />
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
                        href={`/api/go/${row.ticker}`} 
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

      {/* Inline Advertisement */}
      <div className="my-6">
        <AdBanner size="inline" />
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
                        href={`/api/go/${row.ticker}`} 
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

      {/* --- PERFORMANCE CHARTS SECTION --- */}
      <div className="mt-12 border-t border-border pt-8">
        <StHeader>📊 Performance Charts</StHeader>
        <p className="text-muted-foreground text-sm mb-6">Track your trading performance over time</p>
        
        {performanceData.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No completed trades yet.</p>
              <p className="text-sm text-muted-foreground mt-1">Performance charts will appear once you have trades with recorded outcomes.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Win Rate Over Time */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Win Rate Over Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis
                        dataKey="trade"
                        stroke="var(--muted-foreground)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `#${val}`}
                      />
                      <YAxis
                        stroke="var(--muted-foreground)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, 100]}
                        tickFormatter={(val) => `${val}%`}
                      />
                      <ReferenceLine y={50} stroke="var(--muted-foreground)" strokeDasharray="3 3" />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "var(--popover)",
                          borderColor: "var(--border)",
                          borderRadius: "var(--radius)",
                          color: "var(--popover-foreground)",
                        }}
                        formatter={(val: number, name: string) => [`${val.toFixed(1)}%`, "Win Rate"]}
                        labelFormatter={(label) => `Trade #${label}`}
                      />
                      <Line
                        type="monotone"
                        dataKey="winRate"
                        stroke="#22c55e"
                        strokeWidth={2}
                        dot={{ fill: "#22c55e", strokeWidth: 0, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Current: {predictionStats.winRate}% ({predictionStats.wins}W / {predictionStats.losses}L)
                </p>
              </CardContent>
            </Card>

            {/* Cumulative P/L */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Cumulative P/L %
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={performanceData}>
                      <defs>
                        <linearGradient id="colorPL" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={performanceData[performanceData.length - 1]?.cumulativePL >= 0 ? "#22c55e" : "#ef4444"} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={performanceData[performanceData.length - 1]?.cumulativePL >= 0 ? "#22c55e" : "#ef4444"} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis
                        dataKey="trade"
                        stroke="var(--muted-foreground)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `#${val}`}
                      />
                      <YAxis
                        stroke="var(--muted-foreground)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        domain={["auto", "auto"]}
                        tickFormatter={(val) => `${val > 0 ? "+" : ""}${val.toFixed(1)}%`}
                      />
                      <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeDasharray="3 3" />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "var(--popover)",
                          borderColor: "var(--border)",
                          borderRadius: "var(--radius)",
                          color: "var(--popover-foreground)",
                        }}
                        formatter={(val: number) => [
                          <span className={val >= 0 ? "text-green-600" : "text-red-600"}>
                            {val >= 0 ? "+" : ""}{val.toFixed(2)}%
                          </span>,
                          "Cumulative P/L"
                        ]}
                        labelFormatter={(label) => `Trade #${label}`}
                      />
                      <Area
                        type="monotone"
                        dataKey="cumulativePL"
                        stroke={performanceData[performanceData.length - 1]?.cumulativePL >= 0 ? "#22c55e" : "#ef4444"}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorPL)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <p className={`text-xs text-center mt-2 ${performanceData[performanceData.length - 1]?.cumulativePL >= 0 ? "text-green-600" : "text-red-600"}`}>
                  Total: {performanceData[performanceData.length - 1]?.cumulativePL >= 0 ? "+" : ""}{performanceData[performanceData.length - 1]?.cumulativePL.toFixed(2)}%
                </p>
              </CardContent>
            </Card>
          </div>
        )}
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

      {/* Prediction Detail Dialog */}
      <Dialog open={!!selectedPrediction} onOpenChange={() => setSelectedPrediction(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedPrediction?.ticker} Prediction
              <Badge variant="outline">{selectedPrediction?.signalType}</Badge>
            </DialogTitle>
          </DialogHeader>
          {selectedPrediction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Entry Price</p>
                  <p className="font-bold text-lg">${selectedPrediction.entryPrice.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date Logged</p>
                  <p className="font-medium">{new Date(selectedPrediction.predictionDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Outcome</p>
                  <div className="flex items-center gap-2">
                    {selectedPrediction.outcome ? (
                      <>
                        <Badge className={selectedPrediction.outcome === "win" ? "bg-green-600" : "bg-red-600"}>
                          {selectedPrediction.outcome.toUpperCase()}
                        </Badge>
                        {selectedPrediction.outcome === "win" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-green-600 border-green-600 hover:bg-green-500/10"
                            onClick={() => handleShareWin(selectedPrediction)}
                            data-testid="button-share-dialog"
                          >
                            <Share2 className="h-3 w-3 mr-1" /> Share Win
                          </Button>
                        )}
                      </>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </div>
                </div>
                {selectedPrediction.outcomePrice && (
                  <div>
                    <p className="text-muted-foreground">Exit Price</p>
                    <p className="font-bold text-lg">${selectedPrediction.outcomePrice.toFixed(2)}</p>
                  </div>
                )}
              </div>
              
              {!selectedPrediction.outcome && (
                <div className="pt-4 border-t space-y-3">
                  <p className="text-sm text-muted-foreground">Record Outcome:</p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Exit Price"
                      className="flex-1"
                      value={outcomeInputs[selectedPrediction.id]?.price || ""}
                      onChange={(e) =>
                        setOutcomeInputs((prev) => ({
                          ...prev,
                          [selectedPrediction.id]: { ...prev[selectedPrediction.id], price: e.target.value },
                        }))
                      }
                      data-testid="dialog-input-exit"
                    />
                    <Button
                      variant="outline"
                      className="text-green-600 border-green-600"
                      onClick={() => {
                        setOutcomeInputs((prev) => ({ ...prev, [selectedPrediction.id]: { ...prev[selectedPrediction.id], outcome: "win" } }));
                        setTimeout(() => {
                          handleUpdateOutcome(selectedPrediction.id);
                          setSelectedPrediction(null);
                        }, 0);
                      }}
                      disabled={!outcomeInputs[selectedPrediction.id]?.price}
                      data-testid="dialog-button-win"
                    >
                      <TrendingUp className="h-4 w-4 mr-1" /> Win
                    </Button>
                    <Button
                      variant="outline"
                      className="text-red-600 border-red-600"
                      onClick={() => {
                        setOutcomeInputs((prev) => ({ ...prev, [selectedPrediction.id]: { ...prev[selectedPrediction.id], outcome: "loss" } }));
                        setTimeout(() => {
                          handleUpdateOutcome(selectedPrediction.id);
                          setSelectedPrediction(null);
                        }, 0);
                      }}
                      disabled={!outcomeInputs[selectedPrediction.id]?.price}
                      data-testid="dialog-button-loss"
                    >
                      <TrendingDown className="h-4 w-4 mr-1" /> Loss
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Full History Dialog */}
      <Dialog open={showFullHistory} onOpenChange={(open) => { setShowFullHistory(open); if (!open) setHistoryFilter("all"); }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {historyFilter === "win" ? "Winning Predictions" : historyFilter === "loss" ? "Losing Predictions" : "All Prediction History"}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-left font-medium">Ticker</th>
                  <th className="px-3 py-2 text-left font-medium">Signal</th>
                  <th className="px-3 py-2 text-left font-medium">Entry</th>
                  <th className="px-3 py-2 text-left font-medium">Exit</th>
                  <th className="px-3 py-2 text-left font-medium">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {predictionsData
                  .filter((pred) => historyFilter === "all" ? true : pred.outcome === historyFilter)
                  .map((pred) => (
                  <tr 
                    key={pred.id} 
                    className="hover:bg-muted/30 cursor-pointer"
                    onClick={() => {
                      setShowFullHistory(false);
                      setSelectedPrediction(pred);
                    }}
                    data-testid={`history-row-${pred.id}`}
                  >
                    <td className="px-3 py-2 text-muted-foreground">
                      {new Date(pred.predictionDate).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 font-bold">{pred.ticker}</td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="text-xs">{pred.signalType}</Badge>
                    </td>
                    <td className="px-3 py-2">${pred.entryPrice.toFixed(2)}</td>
                    <td className="px-3 py-2">
                      {pred.outcomePrice ? `$${pred.outcomePrice.toFixed(2)}` : "-"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {pred.outcome ? (
                          <>
                            <Badge className={pred.outcome === "win" ? "bg-green-600" : "bg-red-600"}>
                              {pred.outcome.toUpperCase()}
                            </Badge>
                            {pred.outcome === "win" && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleShareWin(pred); }}
                                className="p-1 rounded hover:bg-green-500/20 text-green-600 transition-colors"
                                title="Share your win on Twitter"
                                data-testid={`button-share-history-${pred.id}`}
                              >
                                <Share2 className="h-4 w-4" />
                              </button>
                            )}
                          </>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </StreamlitLayout>
  );
}

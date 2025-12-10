import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
import { Loader2, RefreshCw, ExternalLink, Info, History, TrendingUp, TrendingDown, X, ChevronRight, Star, Plus, BarChart3, Sparkles, Lightbulb, Crown, Share2, Bell, BellOff, Volume2, VolumeX, GraduationCap } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { Link } from "wouter";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AdBanner, AdSidebar } from "@/components/AdBanner";
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

interface MarketScanResponse {
  data: StockData[];
  timestamp: string;
  marketStatus: "pre-market" | "open" | "after-hours" | "closed";
  timestampET: string;
}

// API calls
async function fetchMarketScan(): Promise<MarketScanResponse> {
  const res = await fetch("/api/market/scan");
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  
  return {
    data: json.data,
    timestamp: json.timestamp || new Date().toISOString(),
    marketStatus: json.marketStatus || "closed",
    timestampET: json.timestampET || ""
  };
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

interface Recommendation {
  ticker: string;
  price: number;
  signal: string;
  reasoning: string;
}

interface RecommendationsData {
  buys: Recommendation[];
  sells: Recommendation[];
  generatedAt: string;
}

async function fetchRecommendations(): Promise<RecommendationsData> {
  const res = await fetch("/api/market/recommendations");
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

interface Top10Pick {
  ticker: string;
  price: number;
  openPrice: number;
  prevClose: number;
  closePrice?: number;
  predictedGain: number;
  predictedPrice?: number;
  confidence: number;
  reasoning: string;
}

interface Top10TodayData {
  picks: Top10Pick[];
  generatedAt: string;
  date: string;
  marketOpen?: boolean;
  isAfterHours?: boolean;
  dataSource?: "live" | "previous_close";
}

async function fetchTop10Today(): Promise<Top10TodayData> {
  const res = await fetch("/api/market/top10-today");
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

async function seedHistoricalPredictions(): Promise<{ message: string; data: Prediction[] }> {
  const res = await fetch("/api/predictions/seed-historical", {
    method: "POST",
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json;
}

interface PredictionStats {
  totalRuns: number;
  totalPicks: number;
  wins: number;
  losses: number;
  pending: number;
  winRate: number;
  avgPnl: number;
}

interface HistoricalEntry {
  id: string;
  runId: string;
  ticker: string;
  confidence: number;
  reasoning: string | null;
  entryPrice: number;
  predictedPrice?: number | null;
  closePrice: number | null;
  currentPrice: number | null;
  closePnl: number | null;
  totalPnl: number | null;
  outcome: string | null;
}

interface HistoricalRun {
  id: string;
  runDate: string;
  generatedAt: string;
  finalizedAt: string | null;
  marketOpen: string | null;
  entries: HistoricalEntry[];
}

async function fetchPredictionStats(): Promise<PredictionStats> {
  const res = await fetch("/api/top10/stats");
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

async function fetchPredictionHistory(limit: number = 30): Promise<HistoricalRun[]> {
  const res = await fetch(`/api/top10/history?limit=${limit}`);
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
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element for alerts
  useEffect(() => {
    audioRef.current = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleT1Q3eruvmk4LY/g6NO3bDghmN7u3bBmMRyT4e7ds2YxG5jf8N+wZC4ambDi7caPQBeN0+fcrWQvGZjg8N+wZC4Zmarmmo9DFI3T59yuZDAZmODw37BkLhiZ3+/drmQvGZbg7d+vZC8Zl97v3bBkLhiY3u/ds2YwGZbf7t2xZDAYl9/u3bJlMRiV3+7dsmUxGJbf7t2xZC8Ylt/u3bFkLxiX3+/dsmQvGJff792yZC8Yl9/v3bJkLxeX3+/dsmQvGJbf792yZC8Xlt/v3bJlLxeW4O/dsmUvF5bg8N2yZS8Wlt/w3bJlLxaW3/DdsmUvFpbf8N2zZS4Wlt/w3bNlLhaW3/Des2UuFpbf8N6zZS4Wlt/x3rRlLRaW4PHetGUtFpbg8d60ZS0Wlt/x3rRlLRaW3/Hes2UtFpbe8d6zZS0Vld7x3rNlLRWV3vHes2UtFZXe8d6zZS0VlN7x3rNlLRWU3fDes2UtFZTd8N6zZS0Vk93w3rNlLRWS3fDesWUtFZHd8N6xZS0Vkd3w3rFlLRSR3PDdsWYtFJHc8N2xZi0Ukdzv3bFmLRSR3O/dsWYtFJHb7t2xZy0Tkdvt3bFnLROQ2+3dsWctE4/a7N2xZy0TjtrrzK5mKhSO2uvMrmYqFI7Z6susZioVjtjqy6xmKhWN1+nLrGYqFYzW6MurZioVjNXoy6tmKhWL1OfKq2YqFYrU58qrZioVitPmyqxmKRWJ0uXKrGYpFYjR5MmsZikViNDkyaxmKRWHz+PIrGYpFYbO4seqZSkUhs3hx6plKRSFzODGqmUpFIXL38apZSkUhMrdxqllKBSD");
    audioRef.current.volume = 0.5;
  }, []);

  // Request notification permission
  useEffect(() => {
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        setNotificationsEnabled(true);
      }
    }
  }, []);

  // Function to request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      toast.error("Notifications not supported", { description: "Your browser doesn't support notifications" });
      return;
    }
    
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setNotificationsEnabled(true);
      toast.success("Alerts enabled!", { description: "You'll get notified when Buy signals are detected" });
    } else {
      toast.error("Notifications blocked", { description: "Enable notifications in your browser settings" });
    }
  }, []);

  // Function to send alert (browser notification + sound)
  const sendSignalAlert = useCallback((stock: StockData, signalType: string) => {
    // Play sound if enabled
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
    
    // Send browser notification if enabled and supported
    if (notificationsEnabled && typeof Notification !== "undefined" && Notification.permission === "granted") {
      const icon = signalType === "MOMENTUM BUY" ? "🚀" : signalType === "VALUE BUY" ? "💎" : "⚠️";
      const description = signalType === "MOMENTUM BUY" 
        ? "High volume + bullish confluence" 
        : signalType === "VALUE BUY" 
        ? "Oversold + sentiment not bearish" 
        : "Overbought + bearish sentiment";
      new Notification(`${icon} ${signalType} Alert!`, {
        body: `${stock.ticker} at $${stock.price.toFixed(2)} - ${description}`,
        icon: "/favicon.ico",
        tag: `${stock.ticker}-${signalType}`,
        requireInteraction: true,
      });
    }
  }, [notificationsEnabled, soundEnabled]);

  // Fetch market data with React Query
  const { data: marketScanResponse, isLoading, refetch } = useQuery({
    queryKey: ["market-scan"],
    queryFn: fetchMarketScan,
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });
  
  const marketData = marketScanResponse?.data || [];
  const marketTimestamp = marketScanResponse?.timestampET || "";
  const marketStatus = marketScanResponse?.marketStatus || "closed";

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

  // Fetch weekly recommendations
  const { data: recommendationsData } = useQuery({
    queryKey: ["recommendations"],
    queryFn: fetchRecommendations,
    refetchInterval: 5 * 60 * 1000,
  });

  // Fetch top 10 predictions for today
  const { data: top10TodayData } = useQuery({
    queryKey: ["top10-today"],
    queryFn: fetchTop10Today,
    refetchInterval: 5 * 60 * 1000,
  });

  // Fetch historical prediction stats
  const { data: predictionStatsData } = useQuery({
    queryKey: ["prediction-stats"],
    queryFn: fetchPredictionStats,
    refetchInterval: 5 * 60 * 1000,
  });

  // Fetch prediction history
  const { data: predictionHistoryData = [] } = useQuery({
    queryKey: ["prediction-history"],
    queryFn: () => fetchPredictionHistory(30),
    refetchInterval: 5 * 60 * 1000,
  });

  // State for showing history dialog
  const [showPerformanceHistory, setShowPerformanceHistory] = useState(false);

  // Calculate daily win/loss based on top 10 predictions vs current market prices
  // Entry price = today's open price, show close P/L and after-hours P/L separately
  const dailyPredictionResults = useMemo(() => {
    if (!top10TodayData?.picks || !top10TodayData.picks.length) {
      return { 
        predictions: [], 
        wins: 0, 
        losses: 0, 
        pending: 0, 
        date: top10TodayData?.date || "",
        isAfterHours: top10TodayData?.isAfterHours || false,
        marketOpen: top10TodayData?.marketOpen || false
      };
    }
    
    const isAfterHours = top10TodayData?.isAfterHours || false;
    const marketOpen = top10TodayData?.marketOpen || false;
    
    const results = top10TodayData.picks.map(pick => {
      const currentStock = marketData.find(s => s.ticker === pick.ticker);
      const hasLivePrice = !!currentStock;
      
      // Entry price is always the day's open price
      const entryPrice = pick.openPrice || pick.price;
      
      // Close price from the API (end of regular trading hours)
      const closePrice = pick.closePrice || pick.price;
      
      // Current price (could be after-hours)
      const currentPrice = currentStock?.price || pick.price;
      
      // P/L from open to close (regular trading hours result)
      const closePnl = ((closePrice - entryPrice) / entryPrice) * 100;
      
      // P/L from open to current (includes after-hours if applicable)
      const totalPnl = hasLivePrice ? ((currentPrice - entryPrice) / entryPrice) * 100 : closePnl;
      
      // Determine outcome based on predicted price vs actual close
      // All predictions are bullish (expecting gains), so:
      // Win = close price > entry price (stock went up as predicted)
      // Loss = close price <= entry price (stock didn't go up)
      let outcome: "win" | "loss" | "pending";
      if (!hasLivePrice && !pick.closePrice) {
        outcome = "pending";
      } else if (closePrice > entryPrice) {
        // Stock closed higher than entry - win
        outcome = "win";
      } else {
        // Stock closed at or below entry - loss
        outcome = "loss";
      }
      
      return {
        ...pick,
        entryPrice,
        closePrice,
        currentPrice,
        closePnl: parseFloat(closePnl.toFixed(2)),
        totalPnl: parseFloat(totalPnl.toFixed(2)),
        pnl: parseFloat(closePnl.toFixed(2)), // backwards compat
        outcome,
        hasAfterHours: isAfterHours && Math.abs(currentPrice - closePrice) > 0.01
      };
    });
    
    // Only count wins/losses from items with live prices (not pending)
    const resolvedResults = results.filter(r => r.outcome !== "pending");
    
    return {
      predictions: results,
      wins: resolvedResults.filter(r => r.outcome === "win").length,
      losses: resolvedResults.filter(r => r.outcome === "loss").length,
      pending: results.filter(r => r.outcome === "pending").length,
      date: top10TodayData.date || "",
      isAfterHours,
      marketOpen
    };
  }, [top10TodayData, marketData]);

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

  // Suggested stocks - momentum buys, value buys, and sell warnings
  const suggestedStocks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaysPredictions = predictionsData.filter(p => p.predictionDate.startsWith(today));
    const alreadyLoggedToday = new Set(todaysPredictions.map(p => `${p.ticker}-${p.signalType}`));
    
    const suggestions: { stock: StockData; signalType: string; icon: string }[] = [];
    
    marketData.forEach((stock) => {
      // MOMENTUM BUY: rvol > 3.0 and bullish sentiment and rsi < 85
      const isMomentumBuy = stock.rvol > 3 && stock.sentiment === "🟢 BULLISH" && stock.rsi < 85;
      // VALUE BUY: rsi < 35 and sentiment not bearish
      const isValueBuy = stock.rsi < 35 && stock.sentiment !== "🔴 BEARISH";
      // SELL WARNING: rsi > 80 and bearish sentiment
      const isSellWarning = stock.rsi > 80 && stock.sentiment === "🔴 BEARISH";
      
      if (isMomentumBuy && !alreadyLoggedToday.has(`${stock.ticker}-MOMENTUM BUY`)) {
        suggestions.push({ stock, signalType: "MOMENTUM BUY", icon: "🚀" });
      }
      if (isValueBuy && !alreadyLoggedToday.has(`${stock.ticker}-VALUE BUY`)) {
        suggestions.push({ stock, signalType: "VALUE BUY", icon: "💎" });
      }
      if (isSellWarning && !alreadyLoggedToday.has(`${stock.ticker}-SELL WARNING`)) {
        suggestions.push({ stock, signalType: "SELL WARNING", icon: "⚠️" });
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

  // Auto-log high-confidence signals (Momentum Buy, Value Buy)
  useEffect(() => {
    if (marketData.length === 0 || predictionsData === undefined) return;
    
    const today = new Date().toISOString().split('T')[0];
    const todaysPredictions = predictionsData.filter(p => p.predictionDate.startsWith(today));
    const alreadyLoggedToday = new Set(todaysPredictions.map(p => `${p.ticker}-${p.signalType}`));
    
    marketData.forEach((stock) => {
      // MOMENTUM BUY: rvol > 3.0 and bullish sentiment and rsi < 85
      const isMomentumBuy = stock.rvol > 3 && stock.sentiment === "🟢 BULLISH" && stock.rsi < 85;
      // VALUE BUY: rsi < 35 and sentiment not bearish
      const isValueBuy = stock.rsi < 35 && stock.sentiment !== "🔴 BEARISH";
      
      if (isMomentumBuy) {
        const key = `${stock.ticker}-MOMENTUM BUY`;
        if (!alreadyLoggedToday.has(key) && !autoLoggedTickers.has(key)) {
          setAutoLoggedTickers(prev => new Set(Array.from(prev).concat(key)));
          createPredictionMutation.mutate({
            ticker: stock.ticker,
            signalType: "MOMENTUM BUY",
            entryPrice: stock.price,
          });
          sendSignalAlert(stock, "MOMENTUM BUY");
          toast.success(`🚀 MOMENTUM BUY Detected!`, {
            description: `${stock.ticker} at $${stock.price.toFixed(2)} - High volume + bullish confluence`,
            duration: 5000,
          });
        }
      }
      
      if (isValueBuy) {
        const key = `${stock.ticker}-VALUE BUY`;
        if (!alreadyLoggedToday.has(key) && !autoLoggedTickers.has(key)) {
          setAutoLoggedTickers(prev => new Set(Array.from(prev).concat(key)));
          createPredictionMutation.mutate({
            ticker: stock.ticker,
            signalType: "VALUE BUY",
            entryPrice: stock.price,
          });
          sendSignalAlert(stock, "VALUE BUY");
          toast.success(`💎 VALUE BUY Detected!`, {
            description: `${stock.ticker} at $${stock.price.toFixed(2)} - Oversold + sentiment not bearish`,
            duration: 5000,
          });
        }
      }
    });
  }, [marketData, predictionsData, autoLoggedTickers, createPredictionMutation, sendSignalAlert]);

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
    
    // Collect IDs to process to avoid race conditions
    const idsToProcess: string[] = [];
    
    pendingPredictions.forEach((prediction) => {
      const currentStock = marketData.find(s => s.ticker === prediction.ticker);
      if (!currentStock) return;
      
      // Skip if already being processed
      if (processedOutcomes.has(prediction.id)) return;
      
      idsToProcess.push(prediction.id);
      
      // Determine outcome based on price change
      const outcome = currentStock.price >= prediction.entryPrice ? "win" : "loss";
      const pctChange = ((currentStock.price - prediction.entryPrice) / prediction.entryPrice * 100).toFixed(2);
      
      // Update outcome
      updateOutcomeMutation.mutate({
        id: prediction.id,
        outcome,
        outcomePrice: currentStock.price,
      }, {
        onSuccess: () => {
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
    
    // Mark all as processed IMMEDIATELY to prevent re-runs
    if (idsToProcess.length > 0) {
      setProcessedOutcomes(prev => {
        const next = new Set(prev);
        idsToProcess.forEach(id => next.add(id));
        return next;
      });
    }
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
    
    const tweetText = `🚀 Just called $${pred.ticker} correctly! ${gainSign}${gainPercent}% gain\n\nEntry: $${pred.entryPrice.toFixed(2)} → Exit: $${pred.outcomePrice?.toFixed(2)}\n\nTrack your trades with CNP Direct 📈`;
    
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');
    
    toast.success("Share your win!", { description: "Twitter opened in new window" });
  };

  // Sidebar UI
  const SidebarContent = (
    <div className="space-y-6">
      {/* Today's Predictions & Daily Win/Loss */}
      <div className="rounded-lg bg-card border border-border p-4 text-sm space-y-4">
        <h4 className="font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Today's Top 10 Predictions
        </h4>
        
        {/* Market Status Indicator */}
        {top10TodayData && (
          <div className="flex items-center gap-2 text-xs">
            <Badge 
              variant="outline" 
              className={top10TodayData.marketOpen ? "text-green-600 border-green-600" : "text-yellow-600 border-yellow-600"}
            >
              {top10TodayData.marketOpen ? "🟢 Market Open" : "🌙 After Hours"}
            </Badge>
            {!top10TodayData.marketOpen && (
              <span className="text-muted-foreground">Using {top10TodayData.date} close</span>
            )}
          </div>
        )}
        
        {/* Daily Win/Loss Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-green-500/10 rounded p-2 text-center">
            <p className="text-lg font-bold text-green-600">{dailyPredictionResults.wins}</p>
            <p className="text-[10px] text-muted-foreground">Winning</p>
          </div>
          <div className="bg-red-500/10 rounded p-2 text-center">
            <p className="text-lg font-bold text-red-600">{dailyPredictionResults.losses}</p>
            <p className="text-[10px] text-muted-foreground">Losing</p>
          </div>
          <div className="bg-muted/50 rounded p-2 text-center">
            <p className="text-lg font-bold">
              {dailyPredictionResults.predictions.length > 0 
                ? `${((dailyPredictionResults.wins / dailyPredictionResults.predictions.length) * 100).toFixed(0)}%`
                : "0%"}
            </p>
            <p className="text-[10px] text-muted-foreground">Win Rate</p>
          </div>
        </div>

        {/* Top 5 Predictions Preview */}
        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">Stocks most likely to gain today</p>
          <div className="space-y-2">
            {dailyPredictionResults.predictions.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Analyzing market data...
              </p>
            ) : (
              dailyPredictionResults.predictions.slice(0, 5).map((pick, idx) => (
                <div 
                  key={`${pick.ticker}-${idx}`}
                  className={`flex items-center justify-between text-xs rounded p-2 cursor-pointer transition-colors ${
                    pick.outcome === "win" 
                      ? "bg-green-500/10 hover:bg-green-500/20 border border-green-500/20" 
                      : pick.outcome === "loss"
                      ? "bg-red-500/10 hover:bg-red-500/20 border border-red-500/20"
                      : "bg-muted/30 hover:bg-muted/50 border border-border"
                  }`}
                  onClick={() => setSelectedTicker(pick.ticker)}
                  data-testid={`prediction-${pick.ticker}`}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-foreground">#{idx + 1}</span>
                      <span className="font-bold">{pick.ticker}</span>
                      <Badge 
                        variant="outline" 
                        className={`text-[8px] px-1 py-0 ${
                          pick.outcome === "win" ? "text-green-600 border-green-600" : 
                          pick.outcome === "loss" ? "text-red-600 border-red-600" : 
                          "text-muted-foreground border-muted-foreground"
                        }`}
                      >
                        {pick.confidence}% conf
                      </Badge>
                    </div>
                    <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                      {pick.reasoning}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`font-bold ${pick.closePnl >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {pick.closePnl >= 0 ? "+" : ""}{pick.closePnl}%
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      ${pick.closePrice.toFixed(2)}
                      {pick.hasAfterHours && <span className="text-yellow-600 ml-1">({pick.totalPnl >= 0 ? "+" : ""}{pick.totalPnl}% AH)</span>}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* View All Top 10 Predictions Link */}
          <Button
            variant="link"
            size="sm"
            className="w-full mt-2 text-xs"
            onClick={() => { setHistoryFilter("all"); setShowFullHistory(true); }}
            data-testid="button-view-top-10"
          >
            View All 10 Predictions
          </Button>
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

      {/* Historical Accuracy */}
      {predictionStatsData && (
        <div className="rounded-lg bg-gradient-to-br from-primary/5 via-background to-green-500/5 border border-primary/20 p-4 text-sm space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Historical Accuracy
            </h4>
            <Dialog open={showPerformanceHistory} onOpenChange={setShowPerformanceHistory}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 px-2" data-testid="button-view-history">
                  <History className="h-3 w-3" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Prediction History</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {predictionHistoryData.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No historical predictions yet. Predictions are saved daily at 7:30 AM ET.</p>
                  ) : (
                    <Accordion type="single" collapsible className="w-full">
                      {predictionHistoryData.map((run) => {
                        const wins = run.entries.filter(e => e.outcome === "win").length;
                        const losses = run.entries.filter(e => e.outcome === "loss").length;
                        const avgPnl = run.entries.filter(e => e.closePnl !== null).length > 0
                          ? run.entries.filter(e => e.closePnl !== null).reduce((a, b) => a + (b.closePnl || 0), 0) / run.entries.filter(e => e.closePnl !== null).length
                          : 0;
                        return (
                          <AccordionItem key={run.id} value={run.id}>
                            <AccordionTrigger className="hover:no-underline">
                              <div className="flex items-center justify-between w-full pr-4">
                                <span className="font-medium">{new Date(run.runDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                <div className="flex items-center gap-4 text-sm">
                                  <span className="text-green-600">{wins}W</span>
                                  <span className="text-red-500">{losses}L</span>
                                  <span className={avgPnl >= 0 ? "text-green-600" : "text-red-500"}>
                                    {avgPnl >= 0 ? "+" : ""}{avgPnl.toFixed(2)}%
                                  </span>
                                  {run.finalizedAt ? (
                                    <Badge variant="outline" className="text-xs">Finalized</Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-xs">Pending</Badge>
                                  )}
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="grid gap-2 pt-2">
                                {run.entries.map((entry) => (
                                  <div 
                                    key={entry.id} 
                                    className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                                      entry.outcome === "win" ? "bg-green-500/10" : 
                                      entry.outcome === "loss" ? "bg-red-500/10" : "bg-muted/50"
                                    }`}
                                    data-testid={`history-entry-${entry.ticker}`}
                                  >
                                    <div className="flex items-center gap-3 flex-wrap">
                                      <span className={`font-bold ${entry.outcome === "win" ? "text-green-600" : entry.outcome === "loss" ? "text-red-500" : ""}`}>
                                        {entry.ticker}
                                      </span>
                                      <span className="text-muted-foreground">
                                        Entry: ${entry.entryPrice.toFixed(2)}
                                      </span>
                                      {entry.predictedPrice && (
                                        <span className="text-purple-600">
                                          Target: ${entry.predictedPrice.toFixed(2)}
                                        </span>
                                      )}
                                      {entry.closePrice && (
                                        <span className="text-muted-foreground">
                                          Close: ${entry.closePrice.toFixed(2)}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {entry.closePnl !== null && (
                                        <span className={`font-medium ${entry.closePnl >= 0 ? "text-green-600" : "text-red-500"}`}>
                                          {entry.closePnl >= 0 ? "+" : ""}{entry.closePnl.toFixed(2)}%
                                        </span>
                                      )}
                                      {entry.outcome === "win" && <TrendingUp className="h-4 w-4 text-green-600" />}
                                      {entry.outcome === "loss" && <TrendingDown className="h-4 w-4 text-red-500" />}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-green-600">{predictionStatsData.wins}</div>
              <div className="text-[10px] text-muted-foreground">Wins</div>
            </div>
            <div>
              <div className="text-lg font-bold text-red-500">{predictionStatsData.losses}</div>
              <div className="text-[10px] text-muted-foreground">Losses</div>
            </div>
            <div>
              <div className={`text-lg font-bold ${predictionStatsData.winRate >= 50 ? "text-green-600" : "text-red-500"}`}>
                {predictionStatsData.winRate}%
              </div>
              <div className="text-[10px] text-muted-foreground">Win Rate</div>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-xs pt-2 border-t">
            <span className="text-muted-foreground">{predictionStatsData.totalRuns} days, {predictionStatsData.totalPicks} picks</span>
            {predictionStatsData.avgPnl !== 0 && (
              <span className={predictionStatsData.avgPnl >= 0 ? "text-green-600" : "text-red-500"}>
                Avg: {predictionStatsData.avgPnl >= 0 ? "+" : ""}{predictionStatsData.avgPnl}%
              </span>
            )}
          </div>
        </div>
      )}

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
      <div className="flex items-center justify-between gap-4">
        <StTitle>⚡ Dashboard</StTitle>
        <Button
          onClick={() => refetch()}
          disabled={isLoading}
          size="sm"
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
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

      <StText>
        Real-time market scanner powered by AI sentiment analysis. Identify breakout candidates and oversold
        opportunities instantly.
      </StText>

      {/* --- GAINERS SECTION --- */}
      <div className="mt-8">
{/* Signal Legend */}
        <div className="flex flex-wrap items-center gap-4 mb-4 p-3 rounded-lg bg-muted/50 border border-border text-sm">
          <span className="font-medium text-muted-foreground">Signal Types:</span>
          <div className="flex items-center gap-2">
            <span className="text-lg">🚀</span>
            <span className="font-medium">MOMENTUM BUY</span>
            <Popover>
              <PopoverTrigger className="cursor-pointer"><Info className="h-3 w-3 text-muted-foreground hover:text-foreground" /></PopoverTrigger>
              <PopoverContent className="text-sm">Stocks with unusually high trading volume (3x+ normal) combined with bullish sentiment and RSI below 85. These indicate strong momentum and potential breakout opportunities.</PopoverContent>
            </Popover>
            <span className="text-xs text-muted-foreground">(RVol {">"}3x + Bullish + RSI {"<"}85)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">💎</span>
            <span className="font-medium">VALUE BUY</span>
            <Popover>
              <PopoverTrigger className="cursor-pointer"><Info className="h-3 w-3 text-muted-foreground hover:text-foreground" /></PopoverTrigger>
              <PopoverContent className="text-sm">Oversold stocks (RSI below 35) with sentiment not bearish. These may represent undervalued buying opportunities.</PopoverContent>
            </Popover>
            <span className="text-xs text-muted-foreground">(RSI {"<"}35 + Not Bearish)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <span className="font-medium">SELL WARNING</span>
            <Popover>
              <PopoverTrigger className="cursor-pointer"><Info className="h-3 w-3 text-muted-foreground hover:text-foreground" /></PopoverTrigger>
              <PopoverContent className="text-sm">Overbought stocks (RSI above 80) with bearish sentiment. These may indicate a potential pullback.</PopoverContent>
            </Popover>
            <span className="text-xs text-muted-foreground">(RSI {">"}80 + Bearish)</span>
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <h2 className="text-xl font-bold">📈 Top Gainers</h2>
          <div className="flex items-center gap-3 text-sm">
            {marketStatus === "open" && (
              <Badge className="bg-green-600 animate-pulse">🟢 Market Open</Badge>
            )}
            {marketStatus === "pre-market" && (
              <Badge className="bg-blue-600">🌅 Pre-Market</Badge>
            )}
            {marketStatus === "after-hours" && (
              <Badge className="bg-purple-600">🌙 After Hours</Badge>
            )}
            {marketStatus === "closed" && (
              <Badge variant="outline" className="text-muted-foreground">Market Closed</Badge>
            )}
            {marketTimestamp && (
              <span className="text-xs text-muted-foreground">
                Updated {marketTimestamp}
              </span>
            )}
          </div>
        </div>
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
                        className="text-blue-600 dark:text-blue-400 hover:underline"
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
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <h2 className="text-xl font-bold">📉 Top Losers (Dip Watch)</h2>
          <div className="flex items-center gap-3 text-sm">
            {marketStatus === "open" && (
              <Badge className="bg-green-600 animate-pulse">🟢 Market Open</Badge>
            )}
            {marketStatus === "pre-market" && (
              <Badge className="bg-blue-600">🌅 Pre-Market</Badge>
            )}
            {marketStatus === "after-hours" && (
              <Badge className="bg-purple-600">🌙 After Hours</Badge>
            )}
            {marketStatus === "closed" && (
              <Badge variant="outline" className="text-muted-foreground">Market Closed</Badge>
            )}
            {marketTimestamp && (
              <span className="text-xs text-muted-foreground">
                Updated {marketTimestamp}
              </span>
            )}
          </div>
        </div>
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
                        className="text-blue-600 dark:text-blue-400 hover:underline"
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


      {/* --- WEEKLY TOP 5 PICKS SECTION --- */}
      <div className="mt-12 border-t border-border pt-8">
        <StHeader>🎯 Weekly Top 5 Picks</StHeader>
        <p className="text-muted-foreground text-sm mb-6">AI-generated buy and sell recommendations based on technical indicators</p>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top 5 Buys */}
          <Card className="border-green-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Top Buy Opportunities
                <Badge variant="outline" className="text-green-600 border-green-600 ml-auto text-xs">
                  Oversold
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!recommendationsData?.buys?.length ? (
                <p className="text-sm text-muted-foreground text-center py-4">No buy signals detected currently</p>
              ) : (
                <div className="space-y-3">
                  {recommendationsData.buys.map((rec, idx) => (
                    <div 
                      key={rec.ticker} 
                      className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-500/20 hover:bg-green-500/10 transition-colors cursor-pointer"
                      onClick={() => setSelectedTicker(rec.ticker)}
                      data-testid={`rec-buy-${rec.ticker}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-green-600">#{idx + 1}</span>
                        <div>
                          <a 
                            href={`/api/go/${rec.ticker}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="font-bold text-green-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {rec.ticker}
                          </a>
                          <p className="text-xs text-muted-foreground">{rec.reasoning}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${rec.price.toFixed(2)}</p>
                        <Badge className="bg-green-600 text-xs">BUY</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top 5 Sells */}
          <Card className="border-red-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                Sell Warnings
                <Badge variant="outline" className="text-red-600 border-red-600 ml-auto text-xs">
                  Overbought
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!recommendationsData?.sells?.length ? (
                <p className="text-sm text-muted-foreground text-center py-4">No sell warnings detected currently</p>
              ) : (
                <div className="space-y-3">
                  {recommendationsData.sells.map((rec, idx) => (
                    <div 
                      key={rec.ticker} 
                      className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/20 hover:bg-red-500/10 transition-colors cursor-pointer"
                      onClick={() => setSelectedTicker(rec.ticker)}
                      data-testid={`rec-sell-${rec.ticker}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-red-600">#{idx + 1}</span>
                        <div>
                          <a 
                            href={`/api/go/${rec.ticker}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="font-bold text-red-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {rec.ticker}
                          </a>
                          <p className="text-xs text-muted-foreground">{rec.reasoning}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${rec.price.toFixed(2)}</p>
                        <Badge className="bg-red-600 text-xs">SELL</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {recommendationsData?.generatedAt && (
          <p className="text-xs text-muted-foreground text-center mt-4">
            Last updated: {new Date(recommendationsData.generatedAt).toLocaleString()}
          </p>
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

        {/* Trading Resources Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Free Learning Resources */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Free Trading Resources
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <a 
                href="https://www.investopedia.com/trading-4427765" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
                data-testid="link-resource-investopedia"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm group-hover:text-primary">Investopedia Trading Guide</p>
                  <p className="text-xs text-muted-foreground">Complete beginner to advanced trading concepts</p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>
              <a 
                href="https://www.investopedia.com/terms/r/rsi.asp" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
                data-testid="link-resource-rsi"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm group-hover:text-primary">Understanding RSI Indicator</p>
                  <p className="text-xs text-muted-foreground">Learn to read overbought/oversold signals</p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>
              <a 
                href="https://www.stockcharts.com/school/doku.php?id=chart_school" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
                data-testid="link-resource-chartschool"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm group-hover:text-primary">StockCharts Chart School</p>
                  <p className="text-xs text-muted-foreground">Technical analysis & chart patterns</p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>
            </CardContent>
          </Card>

          {/* Premium Training - Affiliate Links */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                Premium Trading Courses
                <Badge variant="outline" className="text-[10px] ml-auto">Recommended</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <a 
                href="/api/affiliate/training/warrior" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-colors group"
                data-testid="link-affiliate-warrior"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm group-hover:text-amber-600">Warrior Trading</p>
                  <p className="text-xs text-muted-foreground">Day trading courses & live trading room</p>
                </div>
                <Badge className="bg-amber-500 text-xs">Popular</Badge>
              </a>
              <a 
                href="/api/affiliate/training/tradingview" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
                data-testid="link-affiliate-tradingview"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm group-hover:text-primary">TradingView Pro</p>
                  <p className="text-xs text-muted-foreground">Advanced charting & screening tools</p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>
              <a 
                href="/api/affiliate/training/tradeideas" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
                data-testid="link-affiliate-tradeideas"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm group-hover:text-primary">Trade Ideas</p>
                  <p className="text-xs text-muted-foreground">AI-powered stock scanner & alerts</p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>
              <a 
                href="/api/affiliate/training/simpler" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
                data-testid="link-affiliate-simpler"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm group-hover:text-primary">Simpler Trading</p>
                  <p className="text-xs text-muted-foreground">Options & futures trading education</p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>
            </CardContent>
          </Card>
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

      {/* Top 10 Predictions Dialog - Full Screen */}
      <Dialog open={showFullHistory} onOpenChange={(open) => { setShowFullHistory(open); if (!open) setHistoryFilter("all"); }}>
        <DialogContent className="w-screen h-screen max-w-none max-h-none m-0 rounded-none flex flex-col">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="flex items-center gap-2 text-xl">
              Today's Top 10 Predictions
              {top10TodayData?.date && (
                <Badge variant="outline" className="text-xs font-normal">
                  {new Date(top10TodayData.date).toLocaleDateString()}
                </Badge>
              )}
              {top10TodayData && (
                <Badge 
                  variant="outline" 
                  className={`text-xs font-normal ${top10TodayData.marketOpen ? "text-green-600 border-green-600" : "text-yellow-600 border-yellow-600"}`}
                >
                  {top10TodayData.marketOpen ? "🟢 Live" : "🌙 Previous Close"}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4 py-4 border-b">
            <div className="text-center">
              <p className="text-3xl font-bold">{dailyPredictionResults.predictions.length}</p>
              <p className="text-sm text-muted-foreground">Total Picks</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{dailyPredictionResults.wins}</p>
              <p className="text-sm text-muted-foreground">Winning</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">{dailyPredictionResults.losses}</p>
              <p className="text-sm text-muted-foreground">Losing</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">
                {dailyPredictionResults.predictions.length > 0 
                  ? `${((dailyPredictionResults.wins / dailyPredictionResults.predictions.length) * 100).toFixed(0)}%`
                  : "0%"}
              </p>
              <p className="text-sm text-muted-foreground">Win Rate</p>
            </div>
          </div>
          
          {/* Accordion for each pick */}
          <div className="overflow-y-auto flex-1 px-2">
            {dailyPredictionResults.predictions.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Analyzing market data to generate predictions...
              </div>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {dailyPredictionResults.predictions.map((pick, idx) => (
                  <AccordionItem 
                    key={`${pick.ticker}-${idx}`} 
                    value={`pick-${idx}`}
                    className={`${
                      pick.outcome === "win" ? "bg-green-500/5" : 
                      pick.outcome === "loss" ? "bg-red-500/5" : ""
                    }`}
                    data-testid={`top10-accordion-${pick.ticker}`}
                  >
                    <AccordionTrigger className="hover:no-underline px-4 py-3">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-muted-foreground w-8">#{idx + 1}</span>
                          <span className={`text-2xl ${pick.outcome === "win" ? "text-green-600" : pick.outcome === "loss" ? "text-red-600" : ""}`}>
                            {pick.outcome === "win" ? "📈" : pick.outcome === "loss" ? "📉" : "⏳"}
                          </span>
                          <span className="text-xl font-bold">{pick.ticker}</span>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              pick.outcome === "win" ? "text-green-600 border-green-600 bg-green-500/10" : 
                              pick.outcome === "loss" ? "text-red-600 border-red-600 bg-red-500/10" : 
                              "text-muted-foreground"
                            }`}
                          >
                            {pick.outcome === "win" ? "WIN" : pick.outcome === "loss" ? "LOSS" : "PENDING"}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {pick.confidence}% confidence
                          </Badge>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className={`text-xl font-bold ${pick.closePnl >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {pick.closePnl >= 0 ? "+" : ""}{pick.closePnl}%
                            </p>
                            <p className="text-xs text-muted-foreground">Close P/L</p>
                          </div>
                          {dailyPredictionResults.isAfterHours && pick.hasAfterHours && (
                            <div className="text-right">
                              <p className={`text-xl font-bold ${pick.totalPnl >= 0 ? "text-green-600" : "text-red-600"}`}>
                                {pick.totalPnl >= 0 ? "+" : ""}{pick.totalPnl}%
                              </p>
                              <p className="text-xs text-yellow-600">Total (AH)</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 p-4 bg-muted/30 rounded-lg">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Entry Price (Open)</p>
                          <p className="text-2xl font-bold">${pick.entryPrice.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {top10TodayData?.date ? new Date(top10TodayData.date).toLocaleDateString() : ""} 9:30 AM ET
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Close Price</p>
                          <p className="text-2xl font-bold">${pick.closePrice.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {top10TodayData?.date ? new Date(top10TodayData.date).toLocaleDateString() : ""} 4:00 PM ET
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Current Price</p>
                          <p className="text-2xl font-bold">
                            ${pick.currentPrice.toFixed(2)}
                            {pick.hasAfterHours && <span className="text-sm text-yellow-600 ml-1">AH</span>}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date().toLocaleDateString()} {new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/New_York" })} ET
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Close P/L</p>
                          <p className={`text-2xl font-bold ${pick.closePnl >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {pick.closePnl >= 0 ? "+" : ""}{pick.closePnl}%
                          </p>
                        </div>
                        {dailyPredictionResults.isAfterHours && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Total P/L (incl. AH)</p>
                            <p className={`text-2xl font-bold ${pick.totalPnl >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {pick.totalPnl >= 0 ? "+" : ""}{pick.totalPnl}%
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Predicted Gain</p>
                          <p className="text-2xl font-bold text-blue-600">+{pick.predictedGain}%</p>
                        </div>
                        {pick.predictedPrice && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Predicted Close</p>
                            <p className="text-2xl font-bold text-purple-600">${pick.predictedPrice.toFixed(2)}</p>
                            {pick.closePrice && (
                              <p className={`text-xs mt-1 ${pick.closePrice >= pick.predictedPrice * 0.995 ? "text-green-600" : "text-red-500"}`}>
                                {pick.closePrice >= pick.predictedPrice ? "Hit Target" : 
                                  `${((pick.closePrice - pick.entryPrice) / (pick.predictedPrice - pick.entryPrice) * 100).toFixed(0)}% of target`}
                              </p>
                            )}
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Confidence</p>
                          <p className="text-2xl font-bold">{pick.confidence}%</p>
                        </div>
                      </div>
                      <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-2">Reasoning</p>
                        <p className="text-base">{pick.reasoning}</p>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowFullHistory(false);
                            setSelectedTicker(pick.ticker);
                          }}
                          data-testid={`button-view-chart-${pick.ticker}`}
                        >
                          <BarChart3 className="h-4 w-4 mr-1" /> View Chart
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <a 
                            href={`/api/go/${pick.ticker}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            data-testid={`button-trade-${pick.ticker}`}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" /> Trade {pick.ticker}
                          </a>
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </StreamlitLayout>
  );
}

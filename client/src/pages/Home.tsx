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
import { 
  ArrowPathIcon, 
  ArrowTopRightOnSquareIcon, 
  InformationCircleIcon, 
  ClockIcon, 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon, 
  XMarkIcon, 
  ChevronRightIcon, 
  StarIcon, 
  PlusIcon, 
  ChartBarIcon, 
  SparklesIcon, 
  LightBulbIcon, 
  ShareIcon, 
  BellIcon, 
  BellSlashIcon, 
  SpeakerWaveIcon, 
  SpeakerXMarkIcon, 
  AcademicCapIcon, 
  ViewfinderCircleIcon, 
  BoltIcon, 
  ShieldExclamationIcon, 
  ChartPieIcon, 
  CurrencyDollarIcon, 
  LockClosedIcon, 
  FireIcon, 
  TrophyIcon 
} from "@heroicons/react/24/outline";
import { useSettings } from "@/contexts/SettingsContext";
import { Link } from "wouter";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AdBanner } from "@/components/AdBanner";
import MarketRadar from "@/components/MarketRadar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Area, AreaChart, Bar, BarChart, ComposedChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, Legend } from "recharts";
import { motion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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

interface SentimentTrendPoint {
  date: string;
  positive: number;
  neutral: number;
  negative: number;
  score: number;
  articleCount: number;
}

interface MarketScanResponse {
  data: StockData[];
  timestamp: string;
  marketStatus: "pre-market" | "open" | "after-hours" | "closed";
  timestampET: string;
}

interface AISignalResult {
  ticker: string;
  signal: "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";
  confidence: number;
  reasoning: string;
  entryPrice?: number;
  targetPrice?: number;
  stopLoss?: number;
}

interface AIMarketInsights {
  gainersAnalysis: string;
  losersAnalysis: string;
  marketSentiment: string;
  topBuyOpportunities: AISignalResult[];
  topSellWarnings: AISignalResult[];
  timestamp: string;
}

interface AIAccuracyStats {
  overall: {
    totalPredictions: number;
    correctPredictions: number;
    winRate: number;
    avgConfidence: number;
    avgActualReturn: number;
  };
  byFeature: Record<string, { totalPredictions: number; correctPredictions: number; winRate: number }>;
  recentTrend: { date: string; winRate: number }[];
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
  // ⚡ ABSOLUTE URL: Bypass Vite proxy and talk directly to backend
  const res = await fetch(`http://localhost:5000/api/market/chart/${ticker.toUpperCase()}`);
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

async function fetchSentimentTrend(ticker: string): Promise<SentimentTrendPoint[]> {
  const res = await fetch(`/api/market/sentiment-trend/${ticker}`);
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

async function fetchAIMarketInsights(): Promise<AIMarketInsights> {
  const res = await fetch("/api/ai/market-insights");
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

async function fetchAIAccuracyStats(): Promise<AIAccuracyStats> {
  const res = await fetch("/api/ai/accuracy-stats");
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

async function fetchAISignal(ticker: string): Promise<AISignalResult> {
  const res = await fetch(`/api/ai/signal/${ticker}`);
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
  stopLoss?: number;
  riskLevel?: "low" | "medium" | "high";
  riskRewardRatio?: string;
  volatility?: number;
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
  winStreak?: number;
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
  const [aiResult, setAiResult] = useState<{ type: string; title: string; content: string; loading: boolean; error: string | null }>({ type: "", title: "", content: "", loading: false, error: null });
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
    // Explicit queryFn prevents default queryFn from constructing wrong URL
  });

  // Fetch news for selected ticker
  const { data: newsData = [] } = useQuery({
    queryKey: ["news", selectedTicker],
    queryFn: () => fetchNews(selectedTicker),
    enabled: !!selectedTicker,
  });

  // Fetch sentiment trend for selected ticker
  const { data: sentimentTrendData = [] } = useQuery({
    queryKey: ["sentimentTrend", selectedTicker],
    queryFn: () => fetchSentimentTrend(selectedTicker),
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

  // Fetch AI market insights
  const { data: aiInsightsData, isLoading: aiInsightsLoading, refetch: refetchAIInsights } = useQuery({
    queryKey: ["ai-market-insights"],
    queryFn: fetchAIMarketInsights,
    refetchInterval: 10 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch Market Sentinel scan
  const { data: sentinelData, isLoading: sentinelLoading, refetch: refetchSentinel } = useQuery({
    queryKey: ["sentinel-scan"],
    queryFn: fetchSentinelScan,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
    enabled: false, // Only fetch on demand
  });

  // Fetch AI accuracy stats
  const { data: aiAccuracyData } = useQuery({
    queryKey: ["ai-accuracy-stats"],
    queryFn: fetchAIAccuracyStats,
    refetchInterval: 10 * 60 * 1000,
  });

  // State for showing history dialog
  const [showPerformanceHistory, setShowPerformanceHistory] = useState(false);
  
  // State for sorting predictions
  const [predictionSort, setPredictionSort] = useState<"rank" | "confidence" | "return" | "risk">("rank");

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

  // Sorted predictions based on user selection
  const sortedPredictions = useMemo(() => {
    const predictions = [...dailyPredictionResults.predictions];
    if (predictionSort === "confidence") {
      predictions.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    } else if (predictionSort === "return") {
      predictions.sort((a, b) => (b.predictedGain || 0) - (a.predictedGain || 0));
    } else if (predictionSort === "risk") {
      const riskOrder: Record<string, number> = { low: 0, medium: 1, high: 2 };
      predictions.sort((a, b) => (riskOrder[a.riskLevel || "medium"] || 1) - (riskOrder[b.riskLevel || "medium"] || 1));
    }
    return predictions;
  }, [dailyPredictionResults.predictions, predictionSort]);


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
    
    return suggestions.slice(0, 12);
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

  return (
    <StreamlitLayout>
      {/* --- HERO: CNP DIRECT MARKET SENTINEL --- */}
      <div className="mb-8">
        <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-background to-purple-500/5 p-6 shadow-lg">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <img 
                src="/cnp_favicon.png" 
                alt="CNP Direct Market Sentinel" 
                className="w-20 h-20 rounded-xl object-contain shadow-lg border border-primary/20"
              />
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">The Market Sentinel</h1>
                <p className="text-sm text-muted-foreground mt-1">Capital. Net Profit. Direct.</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Real-time trading signals powered by AI sentiment analysis
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {marketStatus === "open" && (
                  <Badge className="bg-green-600 animate-pulse text-sm px-3 py-1">🟢 LIVE</Badge>
                )}
                {marketStatus === "pre-market" && (
                  <Badge className="bg-blue-600 text-sm px-3 py-1">🌅 Pre-Market</Badge>
                )}
                {marketStatus === "after-hours" && (
                  <Badge className="bg-purple-600 text-sm px-3 py-1">🌙 After Hours</Badge>
                )}
                {marketStatus === "closed" && (
                  <Badge variant="outline" className="text-sm px-3 py-1">Market Closed</Badge>
                )}
              </div>
              <Button
                onClick={() => refetch()}
                disabled={isLoading}
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                data-testid="button-refresh"
              >
                {isLoading ? (
                  <>
                    <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" /> Scanning...
                  </>
                ) : (
                  <>
                    <ArrowPathIcon className="mr-2 h-4 w-4" /> Refresh
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {suggestedStocks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {suggestedStocks.slice(0, 6).map((item, idx) => (
                <motion.div
                  key={`${item.stock.ticker}-${item.signalType}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`p-4 rounded-lg border cursor-pointer transition-all hover:scale-[1.02] ${
                    item.signalType === "MOMENTUM BUY" 
                      ? "bg-green-500/10 border-green-500/30 hover:border-green-500/50" 
                      : item.signalType === "VALUE BUY"
                      ? "bg-blue-500/10 border-blue-500/30 hover:border-blue-500/50"
                      : "bg-yellow-500/10 border-yellow-500/30 hover:border-yellow-500/50"
                  }`}
                  onClick={() => setSelectedTicker(item.stock.ticker)}
                  data-testid={`sentinel-signal-${item.stock.ticker}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{item.icon}</span>
                      <a 
                        href={`/api/go/${item.stock.ticker}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-lg hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.stock.ticker}
                      </a>
                    </div>
                    <Badge 
                      className={`text-xs ${
                        item.signalType === "MOMENTUM BUY" 
                          ? "bg-green-600" 
                          : item.signalType === "VALUE BUY"
                          ? "bg-blue-600"
                          : "bg-yellow-600"
                      }`}
                    >
                      {item.signalType}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Price</span>
                    <span className="font-mono font-medium">${item.stock.price.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Change</span>
                    <span className={`font-mono font-medium ${item.stock.changePercent >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {item.stock.changePercent >= 0 ? "+" : ""}{item.stock.changePercent.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">RSI</span>
                    <span className="font-mono">{item.stock.rsi}</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <span className="text-xs">{item.stock.sentiment}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                <ArrowPathIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">No active signals detected</p>
              <p className="text-sm text-muted-foreground mt-1">
                Signals appear when stocks meet momentum or value criteria
              </p>
            </div>
          )}
        </div>
      </div>

      {/* --- TABS NAVIGATION --- */}
      <Tabs defaultValue="signals" className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="signals" className="text-sm font-medium" data-testid="tab-signals">
            📊 Market Signals
          </TabsTrigger>
          <TabsTrigger value="radar" className="text-sm font-medium" data-testid="tab-radar">
            📡 Radar
          </TabsTrigger>
          <TabsTrigger value="sentinel" className="text-sm font-medium" data-testid="tab-sentinel">
            🛡️ Sentinel
          </TabsTrigger>
          <TabsTrigger value="predictions" className="text-sm font-medium" data-testid="tab-predictions">
            🎯 Predictions
          </TabsTrigger>
          <TabsTrigger value="playbook" className="text-sm font-medium" data-testid="tab-playbook">
            🧠 AI Playbook
          </TabsTrigger>
        </TabsList>

        <TabsContent value="radar">
          <MarketRadar />
        </TabsContent>

        <TabsContent value="signals">
          {/* --- GAINERS SECTION --- */}
          <div className="mt-4">
{/* Signal Legend */}
        <div className="flex flex-wrap items-center gap-4 mb-4 p-3 rounded-lg bg-muted/50 border border-border text-sm">
          <span className="font-medium text-muted-foreground">Signal Types:</span>
          <div className="flex items-center gap-2">
            <span className="text-lg">🚀</span>
            <span className="font-medium">MOMENTUM BUY</span>
            <Popover>
              <PopoverTrigger className="cursor-pointer"><InformationCircleIcon className="h-3 w-3 text-muted-foreground hover:text-foreground" /></PopoverTrigger>
              <PopoverContent className="text-sm">Stocks with unusually high trading volume (3x+ normal) combined with bullish sentiment and RSI below 85. These indicate strong momentum and potential breakout opportunities.</PopoverContent>
            </Popover>
            <span className="text-xs text-muted-foreground">(RVol {">"}3x + Bullish + RSI {"<"}85)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">💎</span>
            <span className="font-medium">VALUE BUY</span>
            <Popover>
              <PopoverTrigger className="cursor-pointer"><InformationCircleIcon className="h-3 w-3 text-muted-foreground hover:text-foreground" /></PopoverTrigger>
              <PopoverContent className="text-sm">Oversold stocks (RSI below 35) with sentiment not bearish. These may represent undervalued buying opportunities.</PopoverContent>
            </Popover>
            <span className="text-xs text-muted-foreground">(RSI {"<"}35 + Not Bearish)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <span className="font-medium">SELL WARNING</span>
            <Popover>
              <PopoverTrigger className="cursor-pointer"><InformationCircleIcon className="h-3 w-3 text-muted-foreground hover:text-foreground" /></PopoverTrigger>
              <PopoverContent className="text-sm">Overbought stocks (RSI above 80) with bearish sentiment. These may indicate a potential pullback.</PopoverContent>
            </Popover>
            <span className="text-xs text-muted-foreground">(RSI {">"}80 + Bearish)</span>
          </div>
        </div>

        {/* AI-Powered Insights Section */}
        {aiInsightsData && (
          <div className="mb-6 p-4 rounded-xl border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/5 via-background to-blue-500/5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-purple-500" />
                <h3 className="text-lg font-bold">AI Market Intelligence</h3>
                {aiAccuracyData?.overall && (
                  <Badge variant="outline" className="text-xs">
                    Probability Model Active
                  </Badge>
                )}
              </div>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => refetchAIInsights()}
                disabled={aiInsightsLoading}
                data-testid="button-refresh-ai"
              >
                {aiInsightsLoading ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <ArrowPathIcon className="h-4 w-4" />}
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Top 5 Buy Opportunities */}
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
                  <span className="font-semibold text-green-600">Top 5 Buy Opportunities</span>
                </div>
                {aiInsightsData.topBuyOpportunities.slice(0, 5).map((opp, idx) => (
                  <div key={opp.ticker} className="flex items-center justify-between py-1.5 border-b border-green-500/10 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{idx + 1}.</span>
                      <span className="font-mono font-medium">{opp.ticker}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${opp.signal === "STRONG_BUY" ? "bg-green-600" : "bg-green-500/80"}`}>
                        {opp.confidence}%
                      </Badge>
                    </div>
                  </div>
                ))}
                {aiInsightsData.topBuyOpportunities.length === 0 && (
                  <p className="text-sm text-muted-foreground">No strong buy signals detected</p>
                )}
              </div>
              
              {/* Top 5 Sell Warnings */}
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />
                  <span className="font-semibold text-red-600">Top 5 Sell Warnings</span>
                </div>
                {aiInsightsData.topSellWarnings.slice(0, 5).map((warn, idx) => (
                  <div key={warn.ticker} className="flex items-center justify-between py-1.5 border-b border-red-500/10 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{idx + 1}.</span>
                      <span className="font-mono font-medium">{warn.ticker}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="text-xs bg-red-500/80">
                        {warn.confidence}%
                      </Badge>
                    </div>
                  </div>
                ))}
                {aiInsightsData.topSellWarnings.length === 0 && (
                  <p className="text-sm text-muted-foreground">No sell warnings detected</p>
                )}
              </div>
            </div>
            
            {/* AI Market Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <SparklesIcon className="w-4 h-4 text-blue-500" />
                  <span className="font-medium text-sm">Gainers Analysis</span>
                </div>
                <p className="text-sm text-muted-foreground">{aiInsightsData.gainersAnalysis}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <SparklesIcon className="w-4 h-4 text-orange-500" />
                  <span className="font-medium text-sm">Losers Analysis</span>
                </div>
                <p className="text-sm text-muted-foreground">{aiInsightsData.losersAnalysis}</p>
              </div>
            </div>
          </div>
        )}

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
                    <Popover><PopoverTrigger className="flex items-center gap-1 cursor-pointer">Ticker <InformationCircleIcon className="h-3 w-3" /></PopoverTrigger><PopoverContent className="text-sm">Stock symbol used to identify the company</PopoverContent></Popover>
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <Popover><PopoverTrigger className="flex items-center gap-1 cursor-pointer">Price <InformationCircleIcon className="h-3 w-3" /></PopoverTrigger><PopoverContent className="text-sm">Current trading price in USD</PopoverContent></Popover>
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <Popover><PopoverTrigger className="flex items-center gap-1 cursor-pointer">Change % <InformationCircleIcon className="h-3 w-3" /></PopoverTrigger><PopoverContent className="text-sm">Percentage change from previous close</PopoverContent></Popover>
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <Popover><PopoverTrigger className="flex items-center gap-1 cursor-pointer">RVol <InformationCircleIcon className="h-3 w-3" /></PopoverTrigger><PopoverContent className="text-sm">Relative Volume: 1.0 is normal, 3.0+ indicates high interest</PopoverContent></Popover>
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <Popover><PopoverTrigger className="flex items-center gap-1 cursor-pointer">RSI <InformationCircleIcon className="h-3 w-3" /></PopoverTrigger><PopoverContent className="text-sm">Relative Strength Index: below 30 = oversold, above 70 = overbought</PopoverContent></Popover>
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <Popover><PopoverTrigger className="flex items-center gap-1 cursor-pointer">AI Verdict <InformationCircleIcon className="h-3 w-3" /></PopoverTrigger><PopoverContent className="text-sm">Sentiment analysis based on recent news headlines</PopoverContent></Popover>
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
                      <ArrowPathIcon className="h-6 w-6 animate-spin mx-auto text-primary" />
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
                    <Popover><PopoverTrigger className="flex items-center gap-1 cursor-pointer">Ticker <InformationCircleIcon className="h-3 w-3" /></PopoverTrigger><PopoverContent className="text-sm">Stock symbol used to identify the company</PopoverContent></Popover>
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <Popover><PopoverTrigger className="flex items-center gap-1 cursor-pointer">Price <InformationCircleIcon className="h-3 w-3" /></PopoverTrigger><PopoverContent className="text-sm">Current trading price in USD</PopoverContent></Popover>
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <Popover><PopoverTrigger className="flex items-center gap-1 cursor-pointer">Change % <InformationCircleIcon className="h-3 w-3" /></PopoverTrigger><PopoverContent className="text-sm">Percentage change from previous close</PopoverContent></Popover>
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <Popover><PopoverTrigger className="flex items-center gap-1 cursor-pointer">RVol <InformationCircleIcon className="h-3 w-3" /></PopoverTrigger><PopoverContent className="text-sm">Relative Volume: 1.0 is normal, 3.0+ indicates high interest</PopoverContent></Popover>
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <Popover><PopoverTrigger className="flex items-center gap-1 cursor-pointer">RSI <InformationCircleIcon className="h-3 w-3" /></PopoverTrigger><PopoverContent className="text-sm">Relative Strength Index: below 30 = oversold, above 70 = overbought</PopoverContent></Popover>
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <Popover><PopoverTrigger className="flex items-center gap-1 cursor-pointer">AI Verdict <InformationCircleIcon className="h-3 w-3" /></PopoverTrigger><PopoverContent className="text-sm">Sentiment analysis based on recent news headlines</PopoverContent></Popover>
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
                <ArrowTrendingUpIcon className="h-4 w-4 text-green-600" />
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
                <ArrowTrendingDownIcon className="h-4 w-4 text-red-600" />
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

          {/* News Sentiment Trend Chart */}
          <div>
            <StSubheader>Sentiment Trend (7 Days)</StSubheader>
            <Card className="mt-4">
              <CardContent className="pt-4">
                <div className="h-[200px]" data-testid="chart-sentiment-trend">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={sentimentTrendData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 10 }} 
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        }}
                      />
                      <YAxis 
                        yAxisId="left"
                        tick={{ fontSize: 10 }}
                        label={{ value: 'Articles', angle: -90, position: 'insideLeft', fontSize: 10 }}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        domain={[-1, 1]}
                        tick={{ fontSize: 10 }}
                        label={{ value: 'Score', angle: 90, position: 'insideRight', fontSize: 10 }}
                      />
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        formatter={(value: number, name: string) => {
                          if (name === 'score') return [value.toFixed(2), 'Sentiment Score'];
                          return [value, name.charAt(0).toUpperCase() + name.slice(1)];
                        }}
                        labelFormatter={(label) => {
                          const date = new Date(label);
                          return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Bar yAxisId="left" dataKey="positive" stackId="a" fill="#22c55e" name="Positive" />
                      <Bar yAxisId="left" dataKey="neutral" stackId="a" fill="#64748b" name="Neutral" />
                      <Bar yAxisId="left" dataKey="negative" stackId="a" fill="#ef4444" name="Negative" />
                      <Line 
                        yAxisId="right" 
                        type="monotone" 
                        dataKey="score" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={{ r: 4, fill: '#3b82f6' }}
                        name="Score"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Stacked bars show article sentiment breakdown</span>
                  <span>Blue line shows overall sentiment score (-1 to +1)</span>
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
                    <ArrowTopRightOnSquareIcon className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
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

        {/* Watchlist Section */}
        <div className="mt-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <StarIcon className="h-5 w-5 text-yellow-500" />
                My Watchlist
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Add ticker (e.g., AAPL)"
                  value={watchlistInput}
                  onChange={(e) => setWatchlistInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && watchlistInput.trim()) {
                      addWatchlistMutation.mutate(watchlistInput.trim());
                    }
                  }}
                  className="flex-1"
                  data-testid="input-watchlist"
                />
                <Button
                  onClick={() => {
                    if (watchlistInput.trim()) {
                      addWatchlistMutation.mutate(watchlistInput.trim());
                    }
                  }}
                  disabled={!watchlistInput.trim() || addWatchlistMutation.isPending}
                  data-testid="button-add-watchlist"
                >
                  <PlusIcon className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {watchlistWithPrices.length === 0 ? (
                  <p className="text-sm text-muted-foreground col-span-full text-center py-4">
                    No stocks in watchlist. Add one above!
                  </p>
                ) : (
                  watchlistWithPrices.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-sm bg-muted/30 rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors group"
                      onClick={() => setSelectedTicker(item.ticker)}
                      data-testid={`watchlist-card-${item.ticker}`}
                    >
                      <div className="flex flex-col">
                        <span className="font-bold">{item.ticker}</span>
                        {item.price !== undefined && (
                          <span className="text-xs text-muted-foreground">${item.price.toFixed(2)}</span>
                        )}
                        {item.changePercent !== undefined && (
                          <span className={`text-xs ${item.changePercent >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {item.changePercent >= 0 ? "+" : ""}{item.changePercent.toFixed(2)}%
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-red-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeWatchlistMutation.mutate(item.ticker);
                        }}
                        data-testid={`button-remove-watchlist-card-${item.ticker}`}
                      >
                        <XMarkIcon className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trading Resources Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Free Learning Resources */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <AcademicCapIcon className="h-5 w-5" />
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
                <ArrowTopRightOnSquareIcon className="h-4 w-4 text-muted-foreground" />
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
                <ArrowTopRightOnSquareIcon className="h-4 w-4 text-muted-foreground" />
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
                <ArrowTopRightOnSquareIcon className="h-4 w-4 text-muted-foreground" />
              </a>
            </CardContent>
          </Card>

          {/* Premium Training - Affiliate Links */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <StarIcon className="h-5 w-5 text-amber-500" />
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
                <ArrowTopRightOnSquareIcon className="h-4 w-4 text-muted-foreground" />
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
                <ArrowTopRightOnSquareIcon className="h-4 w-4 text-muted-foreground" />
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
                <ArrowTopRightOnSquareIcon className="h-4 w-4 text-muted-foreground" />
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
        </TabsContent>

        <TabsContent value="sentinel">
          {/* --- MARKET SENTINEL TAB --- */}
          <div className="space-y-6">
            <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-background to-cyan-500/5 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    🛡️ Market Sentinel
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Real-time stock analysis with RSI, relative volume, and news sentiment
                  </p>
                </div>
                <Button
                  onClick={() => refetchSentinel()}
                  disabled={sentinelLoading}
                  className="gap-2"
                  data-testid="button-scan-sentinel"
                >
                  {sentinelLoading ? (
                    <>
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <ArrowPathIcon className="h-4 w-4" />
                      Run Scan
                    </>
                  )}
                </Button>
              </div>

              {/* Signal Legend */}
              <div className="flex flex-wrap gap-3 mb-6 p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-1 text-xs">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  <span>MOMENTUM BUY</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  <span>VALUE BUY</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                  <span>SELL WARNING</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <span className="w-3 h-3 rounded-full bg-gray-400"></span>
                  <span>WAIT</span>
                </div>
              </div>

              {sentinelLoading ? (
                <div className="flex items-center justify-center py-12">
                  <ArrowPathIcon className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-3 text-muted-foreground">Scanning top gainers...</span>
                </div>
              ) : sentinelData?.data && sentinelData.data.length > 0 ? (
                <div className="space-y-4">
                  <div className="text-xs text-muted-foreground mb-2">
                    Found {sentinelData.count} stocks • Last scan: {new Date(sentinelData.timestamp).toLocaleTimeString()}
                  </div>
                  <div className="grid gap-3">
                    {sentinelData.data.map((stock) => (
                      <div
                        key={stock.ticker}
                        className={`p-4 rounded-lg border ${
                          stock.signal === 'MOMENTUM BUY' ? 'bg-green-500/10 border-green-500/30' :
                          stock.signal === 'VALUE BUY' ? 'bg-blue-500/10 border-blue-500/30' :
                          stock.signal === 'SELL WARNING' ? 'bg-orange-500/10 border-orange-500/30' :
                          'bg-muted/30 border-border'
                        }`}
                        data-testid={`sentinel-card-${stock.ticker}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <a
                              href={`/api/go/${stock.ticker}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-bold text-lg text-primary hover:underline"
                            >
                              {stock.ticker}
                            </a>
                            <span className="text-lg font-mono">${stock.price.toFixed(2)}</span>
                            <span className={`text-sm font-medium ${stock.changePercent >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                              {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                            </span>
                          </div>
                          <Badge className={`${
                            stock.signal === 'MOMENTUM BUY' ? 'bg-green-600' :
                            stock.signal === 'VALUE BUY' ? 'bg-blue-600' :
                            stock.signal === 'SELL WARNING' ? 'bg-orange-600' :
                            'bg-gray-500'
                          }`}>
                            {stock.signal}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-4 gap-4 mt-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">RSI:</span>
                            <span className={`ml-2 font-mono ${
                              stock.rsi < 30 ? 'text-green-600' :
                              stock.rsi > 70 ? 'text-red-500' :
                              'text-foreground'
                            }`}>
                              {stock.rsi}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">RVol:</span>
                            <span className={`ml-2 font-mono ${stock.rvol > 2 ? 'text-purple-600 font-bold' : ''}`}>
                              {stock.rvol}x
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Sentiment:</span>
                            <span className={`ml-2 font-mono ${
                              stock.sentimentScore > 0 ? 'text-green-600' :
                              stock.sentimentScore < 0 ? 'text-red-500' :
                              'text-foreground'
                            }`}>
                              {stock.sentimentScore.toFixed(2)}
                            </span>
                          </div>
                          <div>
                            <Badge variant="outline" className={`${
                              stock.verdict === 'BULLISH' ? 'border-green-500 text-green-600' :
                              stock.verdict === 'BEARISH' ? 'border-red-500 text-red-500' :
                              'border-gray-400 text-gray-500'
                            }`}>
                              {stock.verdict === 'BULLISH' ? '🟢' : stock.verdict === 'BEARISH' ? '🔴' : '⚪'} {stock.verdict}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">🛡️</div>
                  <p className="text-muted-foreground">Click "Run Scan" to analyze top market gainers</p>
                  <p className="text-xs text-muted-foreground mt-2">Uses Yahoo Finance data with RSI, volume, and sentiment analysis</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="predictions">
          {/* --- PREDICTIONS TAB CONTENT --- */}
          <div className="space-y-6">
            <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-background to-purple-500/5 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">🎯 Today's Top 10 Predictions</h2>
                {top10TodayData?.generatedAt && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                    <LockClosedIcon className="h-3 w-3" />
                    <span>Generated: {new Date(top10TodayData.generatedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" })} ET</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                AI-generated stock picks with predicted price targets. Track win/loss outcomes based on actual closing prices.
              </p>
              
              {/* Sorting Controls */}
              {dailyPredictionResults.predictions.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs text-muted-foreground">Sort by:</span>
                  <select 
                    className="text-xs px-2 py-1 rounded border border-input bg-background"
                    value={predictionSort}
                    onChange={(e) => setPredictionSort(e.target.value as "rank" | "confidence" | "return" | "risk")}
                    data-testid="select-prediction-sort"
                  >
                    <option value="rank">Rank</option>
                    <option value="confidence">Confidence</option>
                    <option value="return">Potential Return</option>
                    <option value="risk">Risk (Low First)</option>
                  </select>
                </div>
              )}
              
              {dailyPredictionResults.predictions.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <Badge className="bg-green-600">{dailyPredictionResults.wins} Wins</Badge>
                      <Badge className="bg-red-600">{dailyPredictionResults.losses} Losses</Badge>
                      {dailyPredictionResults.pending > 0 && (
                        <Badge variant="outline">{dailyPredictionResults.pending} Pending</Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">{dailyPredictionResults.date}</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sortedPredictions.map((pick, idx) => {
                      // Get original rank for display
                      const originalRank = dailyPredictionResults.predictions.findIndex(p => p.ticker === pick.ticker) + 1;
                      // Calculate progress toward target
                      const progressToTarget = pick.entryPrice && pick.predictedPrice && pick.closePrice
                        ? Math.min(100, Math.max(0, ((pick.closePrice - pick.entryPrice) / (pick.predictedPrice - pick.entryPrice)) * 100))
                        : 0;
                      
                      return (
                        <div
                          key={pick.ticker}
                          className={`p-4 rounded-lg border ${
                            pick.outcome === "win" 
                              ? "bg-green-500/10 border-green-500/30" 
                              : pick.outcome === "loss"
                              ? "bg-red-500/10 border-red-500/30"
                              : "bg-muted/30 border-border"
                          }`}
                          data-testid={`prediction-card-${pick.ticker}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-lg" title={predictionSort !== "rank" ? `AI Rank: #${originalRank}` : undefined}>#{idx + 1}</span>
                              <a 
                                href={`/api/go/${pick.ticker}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-bold text-primary hover:underline"
                              >
                                {pick.ticker}
                              </a>
                              {/* Confidence Gauge */}
                              <div className="flex items-center gap-1" title={`${pick.confidence || 50}% AI Confidence`}>
                                <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${
                                      (pick.confidence || 50) >= 70 ? "bg-green-500" :
                                      (pick.confidence || 50) >= 50 ? "bg-yellow-500" : "bg-red-500"
                                    }`}
                                    style={{ width: `${pick.confidence || 50}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium">{pick.confidence || 50}%</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {/* Risk Badge */}
                              <Badge variant="outline" className={`text-xs ${
                                pick.riskLevel === "low" ? "border-green-500 text-green-600" :
                                pick.riskLevel === "high" ? "border-red-500 text-red-500" :
                                "border-yellow-500 text-yellow-600"
                              }`}>
                                {pick.riskLevel === "low" ? "🛡️ Low" : pick.riskLevel === "high" ? "🔥 High" : "⚖️ Med"}
                              </Badge>
                              <Badge className={
                                pick.outcome === "win" ? "bg-green-600" :
                                pick.outcome === "loss" ? "bg-red-600" :
                                "bg-muted"
                              }>
                                {pick.outcome ? pick.outcome.toUpperCase() : "PENDING"}
                              </Badge>
                            </div>
                          </div>
                          
                          {/* AI Reasoning Tooltip */}
                          {pick.reasoning && (
                            <div className="flex items-center gap-1 mb-2">
                              <Popover>
                                <PopoverTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                                  <InformationCircleIcon className="h-3 w-3" />
                                  <span>Why this pick?</span>
                                </PopoverTrigger>
                                <PopoverContent className="text-sm w-64">
                                  <p className="font-medium mb-1">AI Reasoning:</p>
                                  <p className="text-muted-foreground">{pick.reasoning}</p>
                                </PopoverContent>
                              </Popover>
                            </div>
                          )}
                          
                          {/* Progress to Target Bar */}
                          <div className="mb-3">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>Entry: ${pick.entryPrice?.toFixed(2)}</span>
                              <span>Target: ${pick.predictedPrice?.toFixed(2)}</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all ${
                                  progressToTarget >= 100 ? "bg-green-500" :
                                  progressToTarget >= 50 ? "bg-blue-500" :
                                  progressToTarget > 0 ? "bg-yellow-500" : "bg-red-500"
                                }`}
                                style={{ width: `${Math.max(0, progressToTarget)}%` }}
                              />
                            </div>
                            <div className="text-xs text-center text-muted-foreground mt-1">
                              {progressToTarget >= 100 ? "Target Reached! ✓" : `${progressToTarget.toFixed(0)}% to target`}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Close:</span>
                              <span className="ml-2 font-mono">${pick.closePrice?.toFixed(2) || "Pending"}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">P/L:</span>
                              <span className={`ml-2 font-mono ${pick.closePnl >= 0 ? "text-green-600" : "text-red-600"}`}>
                                {pick.closePnl >= 0 ? "+" : ""}{pick.closePnl?.toFixed(2) || 0}%
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Stop Loss:</span>
                              <span className="ml-2 font-mono text-red-500">${pick.stopLoss?.toFixed(2) || "N/A"}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">R:R:</span>
                              <span className="ml-2 font-mono text-blue-500">{pick.riskRewardRatio || "N/A"}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No predictions for today yet.</p>
                  <p className="text-sm text-muted-foreground mt-2">Predictions are generated at market open.</p>
                </div>
              )}
            </div>

            {/* Prediction History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClockIcon className="h-5 w-5" />
                  Prediction History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  View your past predictions and track overall performance over time.
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => setShowFullHistory(true)}
                  data-testid="button-view-history-tab"
                >
                  <ClockIcon className="h-4 w-4 mr-2" /> View Full History
                </Button>
              </CardContent>
            </Card>

            {/* MISSION PARAMETERS - Core Metrics */}
            {predictionStatsData && (
              <Card className="bg-gradient-to-br from-slate-900/80 via-background to-green-500/5 border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2 uppercase tracking-wider">
                    <ChartBarIcon className="h-5 w-5 text-primary" />
                    Mission Parameters
                    {predictionStatsData.winStreak && predictionStatsData.winStreak >= 3 && (
                      <Badge className="bg-gradient-to-r from-orange-500 to-yellow-500 ml-2">
                        <FireIcon className="h-3 w-3 mr-1" />
                        {predictionStatsData.winStreak} Day Streak!
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 md:grid-cols-7 gap-4 text-center">
                    <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
                      <div className="text-2xl font-bold text-green-500">{predictionStatsData.wins}</div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Wins</div>
                    </div>
                    <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
                      <div className="text-2xl font-bold text-red-500">{predictionStatsData.losses}</div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Losses</div>
                    </div>
                    <div className="rounded-lg p-4 bg-green-500/10 border border-green-500/30">
                      <div className="text-2xl font-bold text-green-400">
                        {predictionStatsData.winRate}%
                      </div>
                      <div className="text-xs text-green-400/80 uppercase tracking-wider">Beta Model Accuracy</div>
                      <div className="text-[10px] text-slate-500 mt-1">Live calibration active</div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="text-2xl font-bold">{predictionStatsData.totalRuns}</div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">Trading Days</div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="text-2xl font-bold">{predictionStatsData.totalPicks}</div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Picks</div>
                    </div>
                    {/* Max Streak Deficit */}
                    <div className="rounded-lg p-4 bg-red-500/10 border border-red-500/40 shadow-[0_0_10px_rgba(255,59,48,0.1)]">
                      <div className="text-2xl font-bold" style={{ color: '#FF3B30' }}>4</div>
                      <div className="text-xs uppercase tracking-wider" style={{ color: 'rgba(255,59,48,0.8)' }}>Max Streak Deficit</div>
                    </div>
                    {/* Tactical Drawdown */}
                    <div className="rounded-lg p-4 bg-red-500/10 border-2 border-red-500/50 shadow-[0_0_15px_rgba(255,59,48,0.2)]">
                      <div className="text-2xl font-bold" style={{ color: '#FF3B30' }}>-14.2%</div>
                      <div className="text-xs uppercase tracking-wider" style={{ color: 'rgba(255,59,48,0.8)' }}>Tactical Drawdown</div>
                    </div>
                  </div>
                  {predictionStatsData.avgPnl !== 0 && (
                    <div className="mt-4 text-center">
                      <span className={`text-lg font-medium ${predictionStatsData.avgPnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                        Total Gain: {predictionStatsData.avgPnl >= 0 ? "+" : ""}{predictionStatsData.avgPnl}%
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="playbook">
          {/* --- AI PLAYBOOK PREMIUM CONTENT --- */}
          <div className="space-y-6">
            {/* Premium Banner */}
            <div className="rounded-xl border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-background to-blue-500/10 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-full bg-purple-500/20">
                  <SparklesIcon className="h-8 w-8 text-purple-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">AI Playbook</h2>
                  <p className="text-muted-foreground">Premium AI-powered trading tools</p>
                </div>
                <Badge className="ml-auto bg-gradient-to-r from-purple-600 to-blue-600">PREMIUM</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Unlock AI-generated trading strategies, market briefings, smart signals, risk assessments, portfolio optimization, pattern recognition, and earnings analysis.
              </p>
            </div>

            {/* Feature Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Trading Strategies */}
              <Card className="border-purple-500/20 hover:border-purple-500/40 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ViewfinderCircleIcon className="h-5 w-5 text-purple-500" />
                    Trading Strategies
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    AI generates personalized trading playbooks based on your style, risk tolerance, and experience level.
                  </p>
                  <Button 
                    variant="outline" 
                    className="w-full border-purple-500/30 hover:bg-purple-500/10"
                    disabled={aiResult.loading}
                    onClick={async () => {
                      setAiResult({ type: "strategy", title: "Trading Strategy", content: "", loading: true, error: null });
                      try {
                        const res = await fetch("/api/ai/playbook/strategies", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ tradingStyle: "swing", riskTolerance: "moderate" })
                        });
                        const data = await res.json();
                        if (data.success && data.data?.sections?.[0]) {
                          setAiResult({ type: "strategy", title: data.data.sections[0].title, content: data.data.sections[0].content, loading: false, error: null });
                        } else {
                          setAiResult({ type: "strategy", title: "Trading Strategy", content: "", loading: false, error: data.error || "Failed to generate" });
                        }
                      } catch (e) { 
                        setAiResult({ type: "strategy", title: "Trading Strategy", content: "", loading: false, error: "Network error" });
                      }
                    }}
                    data-testid="button-generate-strategies"
                  >
                    {aiResult.loading && aiResult.type === "strategy" ? <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" /> : null}
                    Generate Strategy
                  </Button>
                </CardContent>
              </Card>

              {/* Market Briefings */}
              <Card className="border-blue-500/20 hover:border-blue-500/40 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ArrowTrendingUpIcon className="h-5 w-5 text-blue-500" />
                    Market Briefings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Daily AI-generated market reports with sector analysis, key observations, and trading opportunities.
                  </p>
                  <Button 
                    variant="outline" 
                    className="w-full border-blue-500/30 hover:bg-blue-500/10"
                    disabled={aiResult.loading}
                    onClick={async () => {
                      setAiResult({ type: "briefing", title: "Market Briefing", content: "", loading: true, error: null });
                      try {
                        const res = await fetch("/api/ai/playbook/briefing", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({})
                        });
                        const data = await res.json();
                        if (data.success && data.data?.sections?.[0]) {
                          setAiResult({ type: "briefing", title: data.data.sections[0].title, content: data.data.sections[0].content, loading: false, error: null });
                        } else {
                          setAiResult({ type: "briefing", title: "Market Briefing", content: "", loading: false, error: data.error || "Failed to generate" });
                        }
                      } catch (e) { 
                        setAiResult({ type: "briefing", title: "Market Briefing", content: "", loading: false, error: "Network error" });
                      }
                    }}
                    data-testid="button-generate-briefing"
                  >
                    {aiResult.loading && aiResult.type === "briefing" ? <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" /> : null}
                    Get Today's Briefing
                  </Button>
                </CardContent>
              </Card>

              {/* Smart Signals */}
              <Card className="border-green-500/20 hover:border-green-500/40 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BoltIcon className="h-5 w-5 text-green-500" />
                    Smart Entry/Exit Signals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    AI identifies optimal entry and exit points with specific price levels and stop-loss recommendations.
                  </p>
                  <Button 
                    variant="outline" 
                    className="w-full border-green-500/30 hover:bg-green-500/10"
                    disabled={aiResult.loading}
                    onClick={async () => {
                      setAiResult({ type: "signals", title: "Smart Signals", content: "", loading: true, error: null });
                      try {
                        const res = await fetch("/api/ai/playbook/signals", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ tickers: ["AAPL", "MSFT", "NVDA"] })
                        });
                        const data = await res.json();
                        if (data.success && data.data?.sections?.[0]) {
                          setAiResult({ type: "signals", title: data.data.sections[0].title, content: data.data.sections[0].content, loading: false, error: null });
                        } else {
                          setAiResult({ type: "signals", title: "Smart Signals", content: "", loading: false, error: data.error || "Failed to generate" });
                        }
                      } catch (e) { 
                        setAiResult({ type: "signals", title: "Smart Signals", content: "", loading: false, error: "Network error" });
                      }
                    }}
                    data-testid="button-generate-signals"
                  >
                    {aiResult.loading && aiResult.type === "signals" ? <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" /> : null}
                    Generate Signals
                  </Button>
                </CardContent>
              </Card>

              {/* Risk Assessment */}
              <Card className="border-red-500/20 hover:border-red-500/40 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ShieldExclamationIcon className="h-5 w-5 text-red-500" />
                    Risk Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    AI evaluates each stock with risk/reward scores, key risk factors, and position size recommendations.
                  </p>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Ticker (e.g., AAPL)" 
                      className="flex-1"
                      id="risk-ticker-input"
                      data-testid="input-risk-ticker"
                    />
                    <Button 
                      variant="outline" 
                      className="border-red-500/30 hover:bg-red-500/10"
                      disabled={aiResult.loading}
                      onClick={async () => {
                        const ticker = (document.getElementById("risk-ticker-input") as HTMLInputElement)?.value;
                        if (!ticker) { toast.error("Enter a ticker"); return; }
                        setAiResult({ type: "risk", title: "Risk Assessment", content: "", loading: true, error: null });
                        try {
                          const res = await fetch("/api/ai/playbook/risk", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ ticker })
                          });
                          const data = await res.json();
                          if (data.success && data.data?.sections?.[0]) {
                            setAiResult({ type: "risk", title: data.data.sections[0].title, content: data.data.sections[0].content, loading: false, error: null });
                          } else {
                            setAiResult({ type: "risk", title: "Risk Assessment", content: "", loading: false, error: data.error || "Failed to generate" });
                          }
                        } catch (e) { 
                          setAiResult({ type: "risk", title: "Risk Assessment", content: "", loading: false, error: "Network error" });
                        }
                      }}
                      data-testid="button-generate-risk"
                    >
                      {aiResult.loading && aiResult.type === "risk" ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : "Assess"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Portfolio Optimizer */}
              <Card className="border-amber-500/20 hover:border-amber-500/40 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ChartPieIcon className="h-5 w-5 text-amber-500" />
                    Portfolio Optimizer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    AI suggests portfolio adjustments based on diversification, correlation, and market conditions.
                  </p>
                  <Button 
                    variant="outline" 
                    className="w-full border-amber-500/30 hover:bg-amber-500/10"
                    disabled={aiResult.loading}
                    onClick={async () => {
                      setAiResult({ type: "portfolio", title: "Portfolio Optimization", content: "", loading: true, error: null });
                      try {
                        const res = await fetch("/api/ai/playbook/portfolio", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ 
                            holdings: [
                              { ticker: "AAPL", shares: 10, avgCost: 175 },
                              { ticker: "MSFT", shares: 5, avgCost: 350 },
                              { ticker: "NVDA", shares: 3, avgCost: 120 }
                            ] 
                          })
                        });
                        const data = await res.json();
                        if (data.success && data.data?.sections?.[0]) {
                          setAiResult({ type: "portfolio", title: data.data.sections[0].title, content: data.data.sections[0].content, loading: false, error: null });
                        } else {
                          setAiResult({ type: "portfolio", title: "Portfolio Optimization", content: "", loading: false, error: data.error || "Failed to generate" });
                        }
                      } catch (e) { 
                        setAiResult({ type: "portfolio", title: "Portfolio Optimization", content: "", loading: false, error: "Network error" });
                      }
                    }}
                    data-testid="button-generate-portfolio"
                  >
                    {aiResult.loading && aiResult.type === "portfolio" ? <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" /> : null}
                    Optimize Portfolio
                  </Button>
                </CardContent>
              </Card>

              {/* Pattern Recognition */}
              <Card className="border-cyan-500/20 hover:border-cyan-500/40 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ChartBarIcon className="h-5 w-5 text-cyan-500" />
                    Pattern Recognition
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    AI detects chart patterns (head & shoulders, triangles, flags) with explanations and trade setups.
                  </p>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Ticker (e.g., TSLA)" 
                      className="flex-1"
                      id="pattern-ticker-input"
                      data-testid="input-pattern-ticker"
                    />
                    <Button 
                      variant="outline" 
                      className="border-cyan-500/30 hover:bg-cyan-500/10"
                      disabled={aiResult.loading}
                      onClick={async () => {
                        const ticker = (document.getElementById("pattern-ticker-input") as HTMLInputElement)?.value;
                        if (!ticker) { toast.error("Enter a ticker"); return; }
                        setAiResult({ type: "patterns", title: "Pattern Recognition", content: "", loading: true, error: null });
                        try {
                          const res = await fetch("/api/ai/playbook/patterns", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ ticker })
                          });
                          const data = await res.json();
                          if (data.success && data.data?.sections?.[0]) {
                            setAiResult({ type: "patterns", title: data.data.sections[0].title, content: data.data.sections[0].content, loading: false, error: null });
                          } else {
                            setAiResult({ type: "patterns", title: "Pattern Recognition", content: "", loading: false, error: data.error || "Failed to generate" });
                          }
                        } catch (e) { 
                          setAiResult({ type: "patterns", title: "Pattern Recognition", content: "", loading: false, error: "Network error" });
                        }
                      }}
                      data-testid="button-generate-patterns"
                    >
                      {aiResult.loading && aiResult.type === "patterns" ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : "Analyze"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Earnings Analyzer */}
              <Card className="border-orange-500/20 hover:border-orange-500/40 transition-colors col-span-full lg:col-span-1">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CurrencyDollarIcon className="h-5 w-5 text-orange-500" />
                    Earnings Play Analyzer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    AI analyzes upcoming earnings with pre/post strategies, options plays, and risk considerations.
                  </p>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Ticker (e.g., META)" 
                      className="flex-1"
                      id="earnings-ticker-input"
                      data-testid="input-earnings-ticker"
                    />
                    <Button 
                      variant="outline" 
                      className="border-orange-500/30 hover:bg-orange-500/10"
                      disabled={aiResult.loading}
                      onClick={async () => {
                        const ticker = (document.getElementById("earnings-ticker-input") as HTMLInputElement)?.value;
                        if (!ticker) { toast.error("Enter a ticker"); return; }
                        setAiResult({ type: "earnings", title: "Earnings Analysis", content: "", loading: true, error: null });
                        try {
                          const res = await fetch("/api/ai/playbook/earnings", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ ticker })
                          });
                          const data = await res.json();
                          if (data.success && data.data?.sections?.[0]) {
                            setAiResult({ type: "earnings", title: data.data.sections[0].title, content: data.data.sections[0].content, loading: false, error: null });
                          } else {
                            setAiResult({ type: "earnings", title: "Earnings Analysis", content: "", loading: false, error: data.error || "Failed to generate" });
                          }
                        } catch (e) { 
                          setAiResult({ type: "earnings", title: "Earnings Analysis", content: "", loading: false, error: "Network error" });
                        }
                      }}
                      data-testid="button-generate-earnings"
                    >
                      {aiResult.loading && aiResult.type === "earnings" ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : "Analyze"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Options Signals */}
              <Card className="border-cyan-500/20 hover:border-cyan-500/40 transition-colors col-span-full lg:col-span-1">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ChartBarIcon className="h-5 w-5 text-cyan-500" />
                    Options Signals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    AI generates call/put recommendations with strike prices, Greeks analysis, and risk management.
                  </p>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Ticker (e.g., AAPL)" 
                        className="flex-1"
                        id="options-ticker-input"
                        data-testid="input-options-ticker"
                      />
                      <select 
                        id="options-outlook-select"
                        className="px-3 py-2 rounded-md border border-input bg-background text-sm"
                        defaultValue="neutral"
                        data-testid="select-options-outlook"
                      >
                        <option value="bullish">Bullish</option>
                        <option value="neutral">Neutral</option>
                        <option value="bearish">Bearish</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <select 
                        id="options-timeframe-select"
                        className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-sm"
                        defaultValue="weekly"
                        data-testid="select-options-timeframe"
                      >
                        <option value="weekly">Weekly Expiry</option>
                        <option value="monthly">Monthly Expiry</option>
                        <option value="quarterly">Quarterly/LEAPS</option>
                      </select>
                      <Button 
                        variant="outline" 
                        className="border-cyan-500/30 hover:bg-cyan-500/10"
                        disabled={aiResult.loading}
                        onClick={async () => {
                          const ticker = (document.getElementById("options-ticker-input") as HTMLInputElement)?.value;
                          const outlook = (document.getElementById("options-outlook-select") as HTMLSelectElement)?.value;
                          const timeframe = (document.getElementById("options-timeframe-select") as HTMLSelectElement)?.value;
                          if (!ticker) { toast.error("Enter a ticker"); return; }
                          setAiResult({ type: "options", title: "Options Signals", content: "", loading: true, error: null });
                          try {
                            const res = await fetch("/api/ai/playbook/options", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ ticker, outlook, timeframe })
                            });
                            const data = await res.json();
                            if (data.success && data.data?.sections?.[0]) {
                              setAiResult({ type: "options", title: data.data.sections[0].title, content: data.data.sections[0].content, loading: false, error: null });
                            } else {
                              setAiResult({ type: "options", title: "Options Signals", content: "", loading: false, error: data.error || "Failed to generate" });
                            }
                          } catch (e) { 
                            setAiResult({ type: "options", title: "Options Signals", content: "", loading: false, error: "Network error" });
                          }
                        }}
                        data-testid="button-generate-options"
                      >
                        {aiResult.loading && aiResult.type === "options" ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : "Generate"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* AI Result Display */}
            {(aiResult.loading || aiResult.content || aiResult.error) && (
              <Card className="border-purple-500/30">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <SparklesIcon className="h-5 w-5 text-purple-500" />
                      {aiResult.title}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setAiResult({ type: "", title: "", content: "", loading: false, error: null })}
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {aiResult.loading && (
                    <div className="flex items-center justify-center py-12">
                      <ArrowPathIcon className="h-8 w-8 animate-spin text-purple-500" />
                      <span className="ml-3 text-muted-foreground">Generating AI insights...</span>
                    </div>
                  )}
                  {aiResult.error && (
                    <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                      <p className="text-red-500 text-sm">{aiResult.error}</p>
                    </div>
                  )}
                  {aiResult.content && !aiResult.loading && (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed" dangerouslySetInnerHTML={{ 
                        __html: aiResult.content
                          .replace(/### (.*)/g, '<h3 class="text-lg font-semibold mt-4 mb-2 text-foreground">$1</h3>')
                          .replace(/#### (.*)/g, '<h4 class="text-base font-semibold mt-3 mb-1 text-foreground">$1</h4>')
                          .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
                          .replace(/- (.*)/g, '<li class="ml-4">$1</li>')
                          .replace(/\n/g, '<br/>')
                      }} />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Upgrade CTA for non-premium users */}
            <Card className="border-2 border-dashed border-purple-500/30 bg-purple-500/5">
              <CardContent className="py-8 text-center">
                <StarIcon className="h-12 w-12 mx-auto mb-4 text-purple-500" />
                <h3 className="text-xl font-bold mb-2">Unlock Full AI Playbook Access</h3>
                <p className="text-muted-foreground mb-4">
                  Get unlimited access to all 8 AI-powered trading tools with a premium subscription.
                </p>
                <Link href="/pricing">
                  <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700" data-testid="button-upgrade-premium">
                    Upgrade to Premium
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

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
                            <ShareIcon className="h-3 w-3 mr-1" /> Share Win
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
                      <ArrowTrendingUpIcon className="h-4 w-4 mr-1" /> Win
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
                      <ArrowTrendingDownIcon className="h-4 w-4 mr-1" /> Loss
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
              <p className="text-sm text-muted-foreground">Signal Confidence</p>
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
                          <ChartBarIcon className="h-4 w-4 mr-1" /> View Chart
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
                            <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-1" /> Trade {pick.ticker}
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

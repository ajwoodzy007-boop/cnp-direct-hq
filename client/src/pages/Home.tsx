import React, { useState, useEffect, useMemo } from "react";
import { StreamlitLayout } from "@/components/streamlit/layout";
import {
  StTitle,
  StHeader,
  StSubheader,
  StText,
  StMetric,
  StDataFrame,
  StSelect,
  StLineChart,
} from "@/components/streamlit/widgets";
import { Loader2, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

// --- MOCK LOGIC & DATA GENERATION ---

// Mock market tickers
const MARKET_TICKERS = [
  "NVDA", "TSLA", "AAPL", "AMD", "MSFT", "AMZN", "GOOGL", "META", "NFLX", "COIN",
  "PLTR", "SOFI", "MARA", "RIOT", "DKNG", "UBER", "ABNB", "HOOD", "PYPL", "SQ"
];

// Types
interface StockData {
  Ticker: string;
  Price: number;
  "Change %": number;
  RVol: number;
  RSI: number;
  "AI Verdict": "🟢 BULLISH" | "🔴 BEARISH" | "⚪ NEUTRAL" | "⚪ NO NEWS";
  "Raw Score": number;
}

// Mock analysis function (replacing python analyze_stock_data)
const generateMockData = (ticker: string): StockData => {
  const isGainer = Math.random() > 0.5;
  const change = (Math.random() * 15) * (isGainer ? 1 : -1);
  const rsi = Math.floor(Math.random() * 100);
  const rvol = (Math.random() * 5) + 0.5; // 0.5 to 5.5
  
  let sentiment: StockData["AI Verdict"] = "⚪ NEUTRAL";
  if (change > 5 && rvol > 2) sentiment = "🟢 BULLISH";
  else if (change < -5) sentiment = "🔴 BEARISH";
  
  return {
    Ticker: ticker,
    Price: Math.random() * 1000 + 50,
    "Change %": change,
    RVol: parseFloat(rvol.toFixed(1)),
    RSI: rsi,
    "AI Verdict": sentiment,
    "Raw Score": Math.random() * 2 - 1
  };
};

// Mock chart data generator
const generateChartData = (ticker: string) => {
  let price = 150;
  return Array.from({ length: 90 }, (_, i) => {
    price = price * (1 + (Math.random() * 0.04 - 0.02));
    return {
      date: new Date(Date.now() - (90 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
      price: price
    };
  });
};

// Mock news generator
const generateNews = (ticker: string) => [
  { title: `${ticker} Announces Breakthrough in AI Technology`, url: "#", sentiment: "positive" },
  { title: `Analysts Update Price Target for ${ticker}`, url: "#", sentiment: "neutral" },
  { title: `Market Volatility Affects ${ticker} Sector`, url: "#", sentiment: "negative" }
];

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<StockData[]>([]);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [selectedTicker, setSelectedTicker] = useState<string>(MARKET_TICKERS[0]);

  // "Scan Market" Logic
  const scanMarket = async () => {
    setLoading(true);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const scannedData = MARKET_TICKERS.map(t => generateMockData(t));
    setData(scannedData);
    setLastRefreshed(new Date());
    setLoading(false);
  };

  // Initial load
  useEffect(() => {
    scanMarket();
  }, []);

  // Derived state for tables
  const gainers = useMemo(() => 
    [...data].filter(d => d["Change %"] > 0).sort((a, b) => b["Change %"] - a["Change %"]), 
    [data]
  );
  
  const losers = useMemo(() => 
    [...data].filter(d => d["Change %"] < 0).sort((a, b) => a["Change %"] - b["Change %"]), 
    [data]
  );

  // Chart data for selected ticker
  const chartData = useMemo(() => generateChartData(selectedTicker), [selectedTicker]);
  const newsData = useMemo(() => generateNews(selectedTicker), [selectedTicker]);

  // Sidebar UI
  const SidebarContent = (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Scanner Settings</h3>
        <Button 
          onClick={scanMarket} 
          disabled={loading}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {loading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scanning...</>
          ) : (
            <><RefreshCw className="mr-2 h-4 w-4" /> Refresh Data</>
          )}
        </Button>
        {lastRefreshed && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Last updated: {lastRefreshed.toLocaleTimeString()}
          </p>
        )}
      </div>

      <div className="rounded-lg bg-card border border-border p-4 text-sm space-y-3">
        <h4 className="font-semibold text-foreground">Legend</h4>
        <div className="flex items-start gap-2">
          <span className="text-xl">🚀</span>
          <div>
            <span className="font-medium text-foreground">Rocket Ship</span>
            <p className="text-xs text-muted-foreground">High RVol ({'>'}3x) + Bullish News</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-xl">💎</span>
          <div>
            <span className="font-medium text-foreground">Diamond in Rough</span>
            <p className="text-xs text-muted-foreground">Low RSI ({'<'}30) + Bullish News</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <StreamlitLayout sidebar={SidebarContent}>
      <StTitle>⚡ Pro Trader's Dashboard</StTitle>
      
      <StText>
        Real-time market scanner powered by AI sentiment analysis. 
        Identify breakout candidates and oversold opportunities instantly.
      </StText>

      {/* --- GAINERS SECTION --- */}
      <div className="mt-8">
        <StHeader>📈 Top Gainers</StHeader>
        <div className="rounded-md border border-border overflow-hidden my-4 bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground font-mono uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 font-medium">Ticker</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Change %</th>
                  <th className="px-4 py-3 font-medium">RVol (Hype)</th>
                  <th className="px-4 py-3 font-medium">RSI (Risk)</th>
                  <th className="px-4 py-3 font-medium">AI Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono">
                {gainers.map((row) => (
                  <tr key={row.Ticker} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2 font-bold">{row.Ticker}</td>
                    <td className="px-4 py-2">${row.Price.toFixed(2)}</td>
                    <td className="px-4 py-2 text-green-600 dark:text-green-400">
                      +{row["Change %"].toFixed(2)}%
                    </td>
                    <td className="px-4 py-2">
                      {row.RVol.toFixed(1)}x
                      {row.RVol > 3 && <span className="ml-1">🚀</span>}
                    </td>
                    <td className="px-4 py-2">
                      {row.RSI}
                      {row.RSI < 30 && <span className="ml-1">💎</span>}
                      {row.RSI > 70 && <span className="ml-1">⚠️</span>}
                    </td>
                    <td className="px-4 py-2">{row["AI Verdict"]}</td>
                  </tr>
                ))}
                {gainers.length === 0 && !loading && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No gainers found.</td></tr>
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
                  <th className="px-4 py-3 font-medium">Ticker</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Change %</th>
                  <th className="px-4 py-3 font-medium">RVol (Hype)</th>
                  <th className="px-4 py-3 font-medium">RSI (Risk)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono">
                {losers.map((row) => (
                  <tr key={row.Ticker} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2 font-bold">{row.Ticker}</td>
                    <td className="px-4 py-2">${row.Price.toFixed(2)}</td>
                    <td className="px-4 py-2 text-red-600 dark:text-red-400">
                      {row["Change %"].toFixed(2)}%
                    </td>
                    <td className="px-4 py-2">{row.RVol.toFixed(1)}x</td>
                    <td className="px-4 py-2">
                      {row.RSI}
                      {row.RSI < 30 && <span className="ml-1">💎</span>}
                    </td>
                  </tr>
                ))}
                {losers.length === 0 && !loading && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No losers found.</td></tr>
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
            options={MARKET_TICKERS} 
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
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
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
                        domain={['auto', 'auto']}
                        tickFormatter={(val) => `$${val.toFixed(0)}`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'var(--popover)', 
                          borderColor: 'var(--border)',
                          borderRadius: 'var(--radius)',
                          color: 'var(--popover-foreground)'
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
                <div key={idx} className="group relative rounded-lg border border-border bg-card p-4 hover:bg-muted/50 transition-colors">
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
                    <span className="text-[10px] text-muted-foreground">2h ago</span>
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

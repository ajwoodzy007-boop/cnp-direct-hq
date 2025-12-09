// Market Data Utilities
// Uses Finnhub API for real data, with mock fallback

import { getQuote, getCandles, getCompanyNews } from "./finnhub";

export interface StockData {
  ticker: string;
  price: number;
  changePercent: number;
  rvol: number;
  rsi: number;
  sentiment: "🟢 BULLISH" | "🔴 BEARISH" | "⚪ NEUTRAL" | "⚪ NO NEWS";
  sentimentScore: number;
}

export interface ChartDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface NewsItem {
  title: string;
  url: string;
  sentiment: "positive" | "neutral" | "negative";
  publishedAt: string;
}

// Popular market tickers
const MARKET_TICKERS = [
  "NVDA", "TSLA", "AAPL", "AMD", "MSFT", "AMZN", "GOOGL", "META", "NFLX", "COIN",
  "PLTR", "SOFI", "MARA", "RIOT", "DKNG", "UBER", "ABNB", "HOOD", "PYPL", "INTC"
];

// Cache for market data
const cache = new Map<string, { data: StockData[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Calculate RSI from price history
function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// Determine sentiment label from score
function getSentimentLabel(score: number): StockData["sentiment"] {
  if (score >= 0.6) return "🟢 BULLISH";
  if (score <= 0.4) return "🔴 BEARISH";
  return "⚪ NEUTRAL";
}

// Mock data generator (fallback when API unavailable)
function generateMockData(ticker: string): StockData {
  const isGainer = Math.random() > 0.5;
  const change = (Math.random() * 15) * (isGainer ? 1 : -1);
  const rsi = Math.floor(Math.random() * 100);
  const rvol = (Math.random() * 5) + 0.5;
  
  let sentiment: StockData["sentiment"] = "⚪ NEUTRAL";
  if (change > 5 && rvol > 2) sentiment = "🟢 BULLISH";
  else if (change < -5) sentiment = "🔴 BEARISH";
  
  return {
    ticker,
    price: Math.random() * 1000 + 50,
    changePercent: parseFloat(change.toFixed(2)),
    rvol: parseFloat(rvol.toFixed(1)),
    rsi,
    sentiment,
    sentimentScore: Math.random() * 2 - 1
  };
}

// Calculate sentiment from news headlines
async function getNewsSentimentFromHeadlines(ticker: string): Promise<{ sentiment: StockData["sentiment"]; score: number }> {
  try {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    
    const news = await getCompanyNews(ticker, formatDate(weekAgo), formatDate(today));
    
    if (!news || news.length === 0) {
      return { sentiment: "⚪ NO NEWS", score: 0 };
    }
    
    // Analyze sentiment from headlines
    let positiveCount = 0;
    let negativeCount = 0;
    
    const positiveWords = ["surge", "soar", "gain", "rise", "up", "high", "record", "beat", "growth", "profit", "rally", "jump", "boost", "strong", "bullish", "outperform", "upgrade"];
    const negativeWords = ["fall", "drop", "sink", "plunge", "down", "low", "miss", "loss", "decline", "cut", "crash", "tumble", "weak", "bearish", "downgrade", "concern", "risk"];
    
    for (const article of news.slice(0, 10)) {
      const lower = article.headline.toLowerCase();
      const posMatches = positiveWords.filter(w => lower.includes(w)).length;
      const negMatches = negativeWords.filter(w => lower.includes(w)).length;
      
      if (posMatches > negMatches) positiveCount++;
      else if (negMatches > posMatches) negativeCount++;
    }
    
    const totalAnalyzed = Math.max(1, positiveCount + negativeCount);
    const bullishPercent = positiveCount / totalAnalyzed;
    
    let sentiment: StockData["sentiment"];
    if (bullishPercent >= 0.6) sentiment = "🟢 BULLISH";
    else if (bullishPercent <= 0.4) sentiment = "🔴 BEARISH";
    else sentiment = "⚪ NEUTRAL";
    
    const score = parseFloat((bullishPercent * 2 - 1).toFixed(3));
    
    return { sentiment, score };
  } catch (error) {
    console.error(`Error getting news sentiment for ${ticker}:`, error);
    return { sentiment: "⚪ NEUTRAL", score: 0 };
  }
}

// Get real stock data from Finnhub
async function getRealStockData(ticker: string): Promise<StockData | null> {
  try {
    const quote = await getQuote(ticker);
    if (!quote || quote.c === 0) return null;

    // Get sentiment from news headlines (works on free tier)
    const { sentiment, score } = await getNewsSentimentFromHeadlines(ticker);

    // Estimate RSI and RVOL (would need historical data for accurate calculation)
    // For now, use approximate values based on price movement
    const rsi = 50 + (quote.dp * 2); // Rough approximation
    const rvol = 1 + Math.abs(quote.dp) / 5; // Rough approximation

    return {
      ticker,
      price: parseFloat(quote.c.toFixed(2)),
      changePercent: parseFloat(quote.dp.toFixed(2)),
      rvol: parseFloat(Math.max(0.5, Math.min(5, rvol)).toFixed(1)),
      rsi: Math.max(0, Math.min(100, Math.round(rsi))),
      sentiment,
      sentimentScore: score
    };
  } catch (error) {
    console.error(`Error fetching data for ${ticker}:`, error);
    return null;
  }
}

// Scan market for gainers/losers
export async function scanMarket(): Promise<StockData[]> {
  const cacheKey = "market_scan";
  const cached = cache.get(cacheKey);
  
  // Return cached data if fresh
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const hasApiKey = !!process.env.FINNHUB_API_KEY;
  const results: StockData[] = [];

  if (hasApiKey) {
    // Fetch real data (limit concurrent requests)
    for (const ticker of MARKET_TICKERS) {
      const data = await getRealStockData(ticker);
      if (data) {
        results.push(data);
      } else {
        // Fallback to mock for failed fetches
        results.push(generateMockData(ticker));
      }
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } else {
    // Use mock data when no API key
    for (const ticker of MARKET_TICKERS) {
      results.push(generateMockData(ticker));
    }
  }

  // Cache results
  cache.set(cacheKey, { data: results, timestamp: Date.now() });
  
  return results;
}

// Get chart data for a specific ticker
export async function getChartData(ticker: string, period: "1d" | "1w" | "1m" | "3m" = "3m"): Promise<ChartDataPoint[]> {
  const now = Math.floor(Date.now() / 1000);
  const periodDays = period === "1d" ? 1 : period === "1w" ? 7 : period === "1m" ? 30 : 90;
  const from = now - (periodDays * 24 * 60 * 60);

  if (process.env.FINNHUB_API_KEY) {
    const candles = await getCandles(ticker, "D", from, now);
    
    if (candles && candles.s === "ok" && candles.c.length > 0) {
      return candles.t.map((timestamp, i) => ({
        date: new Date(timestamp * 1000).toISOString().split('T')[0],
        open: candles.o[i],
        high: candles.h[i],
        low: candles.l[i],
        close: candles.c[i],
        volume: candles.v[i]
      }));
    }
  }

  // Fallback to mock data
  return generateMockChartData(ticker, periodDays);
}

// Generate mock chart data
function generateMockChartData(ticker: string, days: number): ChartDataPoint[] {
  const basePrice = 100 + Math.random() * 400;
  let price = basePrice;
  const result: ChartDataPoint[] = [];
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    price = price * (1 + (Math.random() * 0.04 - 0.02));
    const volatility = price * 0.01;
    const open = price * (1 + (Math.random() - 0.5) * 0.005);
    const close = price;
    const high = Math.max(open, close) + Math.random() * volatility;
    const low = Math.min(open, close) - Math.random() * volatility;
    const volume = Math.floor(1000000 + Math.random() * 5000000);
    
    result.push({
      date: date.toISOString().split('T')[0],
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume
    });
  }
  
  return result;
}

// Get news for a ticker
export async function getNews(ticker: string): Promise<NewsItem[]> {
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  if (process.env.FINNHUB_API_KEY) {
    const news = await getCompanyNews(ticker, formatDate(weekAgo), formatDate(today));
    
    if (news.length > 0) {
      return news.slice(0, 5).map(n => ({
        title: n.headline,
        url: n.url,
        sentiment: determineSentiment(n.headline),
        publishedAt: new Date(n.datetime * 1000).toISOString()
      }));
    }
  }

  // Fallback to mock news
  return generateMockNews(ticker);
}

// Determine sentiment from headline (simple keyword analysis)
function determineSentiment(headline: string): "positive" | "neutral" | "negative" {
  const lower = headline.toLowerCase();
  const positiveWords = ["surge", "soar", "gain", "rise", "up", "high", "record", "beat", "growth", "profit"];
  const negativeWords = ["fall", "drop", "sink", "plunge", "down", "low", "miss", "loss", "decline", "cut"];
  
  const posCount = positiveWords.filter(w => lower.includes(w)).length;
  const negCount = negativeWords.filter(w => lower.includes(w)).length;
  
  if (posCount > negCount) return "positive";
  if (negCount > posCount) return "negative";
  return "neutral";
}

// Generate mock news
function generateMockNews(ticker: string): NewsItem[] {
  const templates = {
    positive: [
      `${ticker} Announces Breakthrough in AI Technology`,
      `Analysts Raise Price Target for ${ticker} to New Highs`,
      `${ticker} Reports Record-Breaking Quarter`,
    ],
    neutral: [
      `Analysts Update Price Target for ${ticker}`,
      `${ticker} Scheduled for Earnings Report Next Week`,
      `Market Watch: What to Expect from ${ticker}`,
    ],
    negative: [
      `Market Volatility Affects ${ticker} Sector`,
      `${ticker} Faces Headwinds from Regulatory Concerns`,
      `Short Interest Increases for ${ticker}`,
    ]
  };
  
  const news: NewsItem[] = [];
  const now = new Date();
  
  const sentiments: ("positive" | "neutral" | "negative")[] = ["positive", "neutral", "negative"];
  
  for (let i = 0; i < 3; i++) {
    const sentiment = sentiments[i % 3];
    const titles = templates[sentiment];
    const title = titles[Math.floor(Math.random() * titles.length)];
    
    const hoursAgo = Math.floor(Math.random() * 48);
    const publishedAt = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
    
    news.push({
      title,
      url: `https://finance.example.com/news/${ticker.toLowerCase()}-${i}`,
      sentiment,
      publishedAt: publishedAt.toISOString()
    });
  }
  
  return news.sort((a, b) => 
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

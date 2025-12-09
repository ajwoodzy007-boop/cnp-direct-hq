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
  openPrice: number;
  prevClose: number;
  dayHigh: number;
  dayLow: number;
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

// Realistic baseline prices for popular tickers (approximate as of Dec 2024)
const BASELINE_PRICES: Record<string, number> = {
  NVDA: 138, TSLA: 352, AAPL: 242, AMD: 137, MSFT: 442,
  AMZN: 218, GOOGL: 192, META: 617, NFLX: 905, COIN: 312,
  PLTR: 71, SOFI: 15, MARA: 24, RIOT: 12, DKNG: 42,
  UBER: 73, ABNB: 134, HOOD: 40, PYPL: 89, INTC: 20
};

// Mock data generator (fallback when API unavailable)
function generateMockData(ticker: string): StockData {
  const basePrice = BASELINE_PRICES[ticker] || 100;
  const variation = basePrice * 0.02 * (Math.random() - 0.5);
  const price = basePrice + variation;
  
  const isGainer = Math.random() > 0.5;
  const change = (Math.random() * 3) * (isGainer ? 1 : -1);
  const rsi = 40 + Math.floor(Math.random() * 30);
  const rvol = 0.8 + (Math.random() * 1.4);
  
  let sentiment: StockData["sentiment"] = "⚪ NEUTRAL";
  if (change > 1.5 && rvol > 1.5) sentiment = "🟢 BULLISH";
  else if (change < -1.5) sentiment = "🔴 BEARISH";
  
  const prevClose = parseFloat((price / (1 + change / 100)).toFixed(2));
  const openPrice = parseFloat((prevClose * (1 + (Math.random() - 0.5) * 0.005)).toFixed(2));
  
  return {
    ticker,
    price: parseFloat(price.toFixed(2)),
    changePercent: parseFloat(change.toFixed(2)),
    rvol: parseFloat(rvol.toFixed(1)),
    rsi,
    sentiment,
    sentimentScore: parseFloat((Math.random() * 0.6 - 0.3).toFixed(3)),
    openPrice,
    prevClose,
    dayHigh: parseFloat((Math.max(openPrice, price) * 1.01).toFixed(2)),
    dayLow: parseFloat((Math.min(openPrice, price) * 0.99).toFixed(2))
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

    // Calculate 24-hour change from previous close (includes after-hours)
    const prevClose = quote.pc > 0 ? quote.pc : quote.c;
    const changeFromPrevClose = ((quote.c - prevClose) / prevClose) * 100;
    
    // Use current price as fallback for open if not available
    const openPrice = quote.o > 0 ? quote.o : quote.c;
    
    // Estimate RSI and RVOL (would need historical data for accurate calculation)
    const rsi = 50 + (changeFromPrevClose * 2); // Rough approximation
    const rvol = 1 + Math.abs(changeFromPrevClose) / 5; // Rough approximation

    return {
      ticker,
      price: parseFloat(quote.c.toFixed(2)),
      changePercent: parseFloat(changeFromPrevClose.toFixed(2)),
      rvol: parseFloat(Math.max(0.5, Math.min(5, rvol)).toFixed(1)),
      rsi: Math.max(0, Math.min(100, Math.round(rsi))),
      sentiment,
      sentimentScore: score,
      openPrice: parseFloat(openPrice.toFixed(2)),
      prevClose: parseFloat(prevClose.toFixed(2)),
      dayHigh: parseFloat((quote.h > 0 ? quote.h : Math.max(openPrice, quote.c)).toFixed(2)),
      dayLow: parseFloat((quote.l > 0 ? quote.l : Math.min(openPrice, quote.c)).toFixed(2))
    };
  } catch (error) {
    console.error(`Error fetching data for ${ticker}:`, error);
    return null;
  }
}

// Get stock data from chart history when real-time quote fails
async function getStockDataFromChart(ticker: string): Promise<StockData | null> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const from = now - (30 * 24 * 60 * 60); // 30 days
    const candles = await getCandles(ticker, "D", from, now);
    
    if (!candles || candles.s !== "ok" || candles.c.length < 2) {
      return null;
    }
    
    const lastIdx = candles.c.length - 1;
    const prices = candles.c;
    const lastPrice = prices[lastIdx];
    
    // Ensure we have valid prices - if last price is 0, return null
    if (!lastPrice || lastPrice <= 0) {
      return null;
    }
    
    const prevClose = prices[lastIdx - 1] > 0 ? prices[lastIdx - 1] : lastPrice;
    const changePercent = ((lastPrice - prevClose) / prevClose) * 100;
    
    // Get today's open, high, low from last candle with fallbacks
    const rawOpen = candles.o[lastIdx];
    const rawHigh = candles.h[lastIdx];
    const rawLow = candles.l[lastIdx];
    
    // Use valid values or fallback to lastPrice
    const openPrice = rawOpen > 0 ? rawOpen : lastPrice;
    const dayHigh = rawHigh > 0 ? rawHigh : Math.max(openPrice, lastPrice);
    const dayLow = rawLow > 0 ? rawLow : Math.min(openPrice, lastPrice);
    
    // Calculate RSI from chart data
    const rsi = calculateRSI(prices);
    
    // Calculate relative volume
    const volumes = candles.v;
    const avgVolume = volumes.slice(0, -1).reduce((a, b) => a + b, 0) / (volumes.length - 1);
    const lastVolume = volumes[lastIdx];
    const rvol = avgVolume > 0 ? lastVolume / avgVolume : 1;
    
    // Get sentiment from news
    const { sentiment, score } = await getNewsSentimentFromHeadlines(ticker);
    
    return {
      ticker,
      price: parseFloat(lastPrice.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      rvol: parseFloat(Math.max(0.5, Math.min(5, rvol)).toFixed(1)),
      rsi: Math.max(0, Math.min(100, Math.round(rsi))),
      sentiment,
      sentimentScore: score,
      openPrice: parseFloat(openPrice.toFixed(2)),
      prevClose: parseFloat(prevClose.toFixed(2)),
      dayHigh: parseFloat(dayHigh.toFixed(2)),
      dayLow: parseFloat(dayLow.toFixed(2))
    };
  } catch (error) {
    console.error(`Error getting chart data for ${ticker}:`, error);
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
      let data = await getRealStockData(ticker);
      
      // If real-time quote fails, try to get data from chart history
      if (!data) {
        data = await getStockDataFromChart(ticker);
      }
      
      // Only use mock data as last resort
      if (data) {
        results.push(data);
      } else {
        console.warn(`Using mock data for ${ticker} - all API calls failed`);
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
    
    // If candles fail, try to get current quote and generate realistic mock data
    const quote = await getQuote(ticker);
    if (quote && quote.c > 0) {
      return generateMockChartData(ticker, periodDays, quote.c);
    }
  }

  // Fallback to mock data with default price
  return generateMockChartData(ticker, periodDays);
}

// Generate mock chart data based on current price
function generateMockChartData(ticker: string, days: number, currentPrice?: number): ChartDataPoint[] {
  // Use real current price if available, otherwise estimate based on ticker
  const basePrice = currentPrice || 100;
  const result: ChartDataPoint[] = [];
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  // Work backwards from current price to generate historical data
  // Assume typical daily volatility of 1-2%
  let price = basePrice;
  const dailyPrices: number[] = [basePrice];
  
  for (let i = days - 1; i > 0; i--) {
    // Random walk backwards with slight downward bias (stocks tend to rise over time)
    const change = (Math.random() * 0.03 - 0.012); // -1.2% to +1.8% daily range
    price = price / (1 + change);
    dailyPrices.unshift(price);
  }
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    const dayPrice = dailyPrices[i];
    const volatility = dayPrice * 0.015;
    const open = dayPrice * (1 + (Math.random() - 0.5) * 0.01);
    const close = dayPrice;
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

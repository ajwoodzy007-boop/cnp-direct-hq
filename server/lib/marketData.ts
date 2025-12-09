// Market Data Utilities
// This module provides realistic mock market data
// TODO: Replace with real API calls (Finnhub, Alpha Vantage, Yahoo Finance)

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
  "PLTR", "SOFI", "MARA", "RIOT", "DKNG", "UBER", "ABNB", "HOOD", "PYPL", "SQ",
  "SHOP", "RBLX", "SNAP", "SPOT", "ZM", "DOCU", "NET", "CRWD", "SNOW", "DDOG"
];

// Cache for market data (simulates 5-minute TTL)
const cache = new Map<string, { data: StockData[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Technical indicator calculation
function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i < period; i++) {
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

// Generate realistic price movement
function generatePriceHistory(basePrice: number, days: number): number[] {
  const prices: number[] = [basePrice];
  let volatility = 0.02; // 2% daily volatility
  
  for (let i = 1; i < days; i++) {
    const change = (Math.random() - 0.5) * 2 * volatility;
    prices.push(prices[i - 1] * (1 + change));
  }
  
  return prices;
}

// Determine sentiment based on price action and random news
function determineSentiment(changePercent: number, rvol: number): { sentiment: StockData["sentiment"], score: number } {
  // Strong bullish signals
  if (changePercent > 5 && rvol > 2.5) {
    return { sentiment: "🟢 BULLISH", score: 0.7 + Math.random() * 0.3 };
  }
  
  // Moderate bullish
  if (changePercent > 2) {
    return { sentiment: "🟢 BULLISH", score: 0.3 + Math.random() * 0.4 };
  }
  
  // Strong bearish
  if (changePercent < -5) {
    return { sentiment: "🔴 BEARISH", score: -0.7 - Math.random() * 0.3 };
  }
  
  // Moderate bearish
  if (changePercent < -2) {
    return { sentiment: "🔴 BEARISH", score: -0.3 - Math.random() * 0.4 };
  }
  
  // Neutral
  return { sentiment: "⚪ NEUTRAL", score: (Math.random() - 0.5) * 0.2 };
}

// Generate realistic stock data
export function generateStockData(ticker: string): StockData {
  const basePrice = 50 + Math.random() * 950; // $50-$1000
  const priceHistory = generatePriceHistory(basePrice, 30);
  const currentPrice = priceHistory[priceHistory.length - 1];
  const previousPrice = priceHistory[priceHistory.length - 2];
  
  const changePercent = ((currentPrice - previousPrice) / previousPrice) * 100;
  const rvol = 0.5 + Math.random() * 4; // 0.5x to 4.5x
  const rsi = calculateRSI(priceHistory);
  
  const { sentiment, score } = determineSentiment(changePercent, rvol);
  
  return {
    ticker,
    price: parseFloat(currentPrice.toFixed(2)),
    changePercent: parseFloat(changePercent.toFixed(2)),
    rvol: parseFloat(rvol.toFixed(1)),
    rsi: Math.round(rsi),
    sentiment,
    sentimentScore: parseFloat(score.toFixed(3))
  };
}

// Scan market for gainers/losers
export function scanMarket(): StockData[] {
  const cacheKey = "market_scan";
  const cached = cache.get(cacheKey);
  
  // Return cached data if fresh
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  // Generate fresh data
  const data = MARKET_TICKERS.map(ticker => generateStockData(ticker));
  
  // Cache it
  cache.set(cacheKey, { data, timestamp: Date.now() });
  
  return data;
}

// Get chart data for a specific ticker
export function getChartData(ticker: string, period: "1d" | "1w" | "1m" | "3m" = "3m"): ChartDataPoint[] {
  const days = period === "1d" ? 1 : period === "1w" ? 7 : period === "1m" ? 30 : 90;
  const basePrice = 100 + Math.random() * 400;
  const prices = generatePriceHistory(basePrice, days);
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return prices.map((price, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    const volatility = price * 0.01; // 1% intraday volatility
    const open = price * (1 + (Math.random() - 0.5) * 0.005);
    const close = price;
    const high = Math.max(open, close) + Math.random() * volatility;
    const low = Math.min(open, close) - Math.random() * volatility;
    const volume = Math.floor(1000000 + Math.random() * 5000000);
    
    return {
      date: date.toISOString().split('T')[0],
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume
    };
  });
}

// Generate news headlines
export function getNews(ticker: string): NewsItem[] {
  const templates = {
    positive: [
      `${ticker} Announces Breakthrough in AI Technology`,
      `Analysts Raise Price Target for ${ticker} to New Highs`,
      `${ticker} Reports Record-Breaking Quarter`,
      `Major Institutional Investors Increase ${ticker} Holdings`,
      `${ticker} Secures Multi-Billion Dollar Contract`
    ],
    neutral: [
      `Analysts Update Price Target for ${ticker}`,
      `${ticker} Scheduled for Earnings Report Next Week`,
      `Market Watch: What to Expect from ${ticker}`,
      `${ticker} Trading Volume Spikes Amid Sector Rotation`,
      `Technical Analysis: ${ticker} Tests Key Support Level`
    ],
    negative: [
      `Market Volatility Affects ${ticker} Sector`,
      `${ticker} Faces Headwinds from Regulatory Concerns`,
      `Bearish Sentiment Grows Around ${ticker}`,
      `${ticker} Misses Analyst Expectations`,
      `Short Interest Increases for ${ticker}`
    ]
  };
  
  const news: NewsItem[] = [];
  const now = new Date();
  
  // Generate 3-5 news items
  const count = 3 + Math.floor(Math.random() * 3);
  
  for (let i = 0; i < count; i++) {
    const sentiments: ("positive" | "neutral" | "negative")[] = ["positive", "neutral", "negative"];
    const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
    const titleOptions = templates[sentiment];
    const title = titleOptions[Math.floor(Math.random() * titleOptions.length)];
    
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

// Finnhub API Integration
// Documentation: https://finnhub.io/docs/api

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const BASE_URL = "https://finnhub.io/api/v1";

if (!FINNHUB_API_KEY) {
  console.warn("Warning: FINNHUB_API_KEY not set. Using mock data.");
}

export interface FinnhubQuote {
  c: number;  // Current price
  d: number;  // Change
  dp: number; // Percent change
  h: number;  // High price of the day
  l: number;  // Low price of the day
  o: number;  // Open price of the day
  pc: number; // Previous close price
  t: number;  // Timestamp
}

export interface FinnhubCandle {
  c: number[];  // Close prices
  h: number[];  // High prices
  l: number[];  // Low prices
  o: number[];  // Open prices
  s: string;    // Status
  t: number[];  // Timestamps
  v: number[];  // Volumes
}

export interface FinnhubNews {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

export interface FinnhubSentiment {
  buzz: { articlesInLastWeek: number; buzz: number; weeklyAverage: number };
  companyNewsScore: number;
  sectorAverageBullishPercent: number;
  sectorAverageNewsScore: number;
  sentiment: { bearishPercent: number; bullishPercent: number };
  symbol: string;
}

// Cache to avoid hitting rate limits
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute cache

async function fetchWithCache<T>(url: string, cacheKey: string): Promise<T | null> {
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Finnhub API error: ${response.status} ${response.statusText}`);
      return null;
    }
    const data = await response.json();
    cache.set(cacheKey, { data, timestamp: Date.now() });
    return data as T;
  } catch (error) {
    console.error("Finnhub fetch error:", error);
    return null;
  }
}

// Get real-time quote for a symbol
export async function getQuote(symbol: string): Promise<FinnhubQuote | null> {
  if (!FINNHUB_API_KEY) return null;
  
  const url = `${BASE_URL}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`;
  return fetchWithCache<FinnhubQuote>(url, `quote:${symbol}`);
}

// Get historical candle data
export async function getCandles(
  symbol: string, 
  resolution: "1" | "5" | "15" | "30" | "60" | "D" | "W" | "M" = "D",
  from: number,
  to: number
): Promise<FinnhubCandle | null> {
  if (!FINNHUB_API_KEY) return null;
  
  const url = `${BASE_URL}/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;
  return fetchWithCache<FinnhubCandle>(url, `candle:${symbol}:${resolution}:${from}:${to}`);
}

// Get company news
export async function getCompanyNews(symbol: string, fromDate: string, toDate: string): Promise<FinnhubNews[]> {
  if (!FINNHUB_API_KEY) return [];
  
  const url = `${BASE_URL}/company-news?symbol=${symbol}&from=${fromDate}&to=${toDate}&token=${FINNHUB_API_KEY}`;
  const data = await fetchWithCache<FinnhubNews[]>(url, `news:${symbol}:${fromDate}:${toDate}`);
  return data || [];
}

// Get news sentiment
export async function getNewsSentiment(symbol: string): Promise<FinnhubSentiment | null> {
  if (!FINNHUB_API_KEY) return null;
  
  const url = `${BASE_URL}/news-sentiment?symbol=${symbol}&token=${FINNHUB_API_KEY}`;
  return fetchWithCache<FinnhubSentiment>(url, `sentiment:${symbol}`);
}

// Get market status
export async function getMarketStatus(): Promise<{ exchange: string; isOpen: boolean } | null> {
  if (!FINNHUB_API_KEY) return null;
  
  const url = `${BASE_URL}/stock/market-status?exchange=US&token=${FINNHUB_API_KEY}`;
  return fetchWithCache(url, "market-status");
}

import axios from 'axios';
import { db } from "../db";
import { historicalPrices, portfolios } from "../../shared/schema";
import { eq, desc } from "drizzle-orm";

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Define the interface for our market data
interface MarketData {
  ticker: string;
  price: number;
  change: number;
  percentChange: number;
  timestamp: string;
  rsi: string;
  signal: string;
}

// Memory cache for the API to serve instantly
let cachedData: MarketData[] = [
  { ticker: 'SPY', price: 0, change: 0, percentChange: 0, rsi: "50", signal: "INITIALIZING", timestamp: new Date().toISOString() }
];

let isScanning = false;

/**
 * BRAIN MATH: Relative Strength Index (RSI)
 * Calculates the momentum of a stock based on the last 14 closing days.
 */
function calculateRSI(closes: number[]): number {
  if (closes.length < 15) return 50; // Neutral if data is insufficient
  let gains = 0;
  let losses = 0;

  for (let i = 0; i < 14; i++) {
    const diff = closes[i] - closes[i + 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }

  if (losses === 0) return 100;
  
  const rs = (gains / 14) / (losses / 14);
  return 100 - (100 / (1 + rs));
}

/**
 * BRAIN LOGIC: Sentiment Analysis
 */
function getSentinelSignal(rsi: number) {
  if (rsi <= 35) return "STRONG BUY";
  if (rsi >= 65) return "AVOID";
  return "NEUTRAL";
}

/**
 * Main entry point called by routes.ts
 */
export async function runDailyScan() {
  console.log("[Sentinel] 🧠 Brain Scan Request Received.");
  
  if (!isScanning) {
    performBackgroundScan().catch(err => console.error("[Sentinel] Background Scan Error:", err));
  }
  
  return cachedData;
}

/**
 * Alias for backward compatibility
 */
export async function runMarketScan() {
  return runDailyScan();
}

/**
 * The core scanning logic
 */
async function performBackgroundScan() {
  isScanning = true;

  // 1. Get all unique tickers from user portfolios (prioritized)
  const userPortfolios = await db
    .select({ ticker_symbol: portfolios.ticker_symbol })
    .from(portfolios)
    .groupBy(portfolios.ticker_symbol);

  const portfolioTickers = userPortfolios.map(p => p.ticker_symbol);

  // 2. Combine portfolio tickers (prioritized) with default tickers
  const defaultTickers = ['SPY', 'QQQ', 'AAPL', 'NVDA', 'TSLA', 'MSFT', 'AMD', 'BTC'];
  const allTickers = [...new Set([...portfolioTickers, ...defaultTickers])]; // Remove duplicates

  // 3. Sort to prioritize portfolio tickers first (7:30 AM deep-dive analysis)
  const sortedTickers = [
    ...portfolioTickers.filter(t => allTickers.includes(t)), // Portfolio tickers first
    ...defaultTickers.filter(t => !portfolioTickers.includes(t)) // Then defaults
  ];

  console.log(`[Sentinel] Scanning ${sortedTickers.length} tickers (${portfolioTickers.length} from portfolios)`);

  const results: MarketData[] = [];

  try {
    for (const ticker of sortedTickers) {
      try {
        console.log(`[Sentinel] Analyzing ${ticker}...`);
        
        // 1. Fetch LIVE Data from Finnhub
        const response = await axios.get(
          `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_KEY}`,
          { timeout: 5000 }
        );
        
        // 2. Fetch HISTORICAL Data from Neon for the RSI calculation
        const history = await db
          .select()
          .from(historicalPrices)
          .where(eq(historicalPrices.ticker, ticker))
          .orderBy(desc(historicalPrices.date))
          .limit(20);

        const closes = history.map(h => parseFloat(h.close_price || "0"));
        const rsiValue = calculateRSI(closes);
        const signal = getSentinelSignal(rsiValue);

        if (response.data && response.data.c) {
          results.push({
            ticker,
            price: response.data.c,
            change: response.data.d,
            percentChange: response.data.dp,
            timestamp: new Date().toISOString(),
            rsi: rsiValue.toFixed(0),
            signal: signal
          });
        }
        
        await sleep(1000); // Respect rate limits
      } catch (e) { 
        console.error(`[Sentinel] Failed to process ${ticker}:`, e);
        continue; 
      }
    }
    
    if (results.length > 0) {
      cachedData = results;
      console.log("[Sentinel] 🚀 Cache updated with fresh technical signals.");
    }
  } finally {
    isScanning = false;
  }
}
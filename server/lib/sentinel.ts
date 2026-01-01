import axios from 'axios';

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Define the interface for our market data
interface MarketData {
  ticker: string;
  price: number;
  change: number;
  percentChange: number;
  timestamp: string;
}

// INITIAL PLACEHOLDER: Prevents frontend crashes on first load
let cachedData: MarketData[] = [
  { ticker: 'SPY', price: 0, change: 0, percentChange: 0, timestamp: new Date().toISOString() },
  { ticker: 'AAPL', price: 0, change: 0, percentChange: 0, timestamp: new Date().toISOString() }
];

let isScanning = false;

/**
 * Main entry point called by the API trigger in routes.ts
 */
export async function runDailyScan() {
  console.log("[Sentinel] Initiating 2026 Daily Market Scan...");
  
  if (!isScanning) {
    // Run in background so the API response remains fast
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

async function performBackgroundScan() {
  isScanning = true;
  const tickers = ['SPY', 'AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMD', 'GOOGL', 'AMZN', 'NFLX', 'META'];
  
  // FIX: Explicitly typing the array so TypeScript allows .push()
  const results: MarketData[] = [];

  try {
    for (const ticker of tickers) {
      try {
        console.log(`[Sentinel] Fetching data for ${ticker}...`);
        const response = await axios.get(
          `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_KEY}`,
          { timeout: 5000 }
        );
        
        if (response.data && response.data.c) {
          results.push({
            ticker,
            price: response.data.c,
            change: response.data.d,
            percentChange: response.data.dp,
            timestamp: new Date().toISOString()
          });
        }
        // Respect API rate limits (1 call per second)
        await sleep(1000); 
      } catch (e) { 
        console.error(`[Sentinel] Failed to fetch ${ticker}:`, e);
        continue; 
      }
    }
    
    if (results.length > 0) {
      cachedData = results;
      console.log("[Sentinel] Cache updated with fresh 2026 market data.");
    }
  } finally {
    isScanning = false;
  }
}
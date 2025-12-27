import axios from 'axios';

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Simple Global Cache
let cachedData: any = null;
let lastScanTime = 0;
const CACHE_DURATION = 60 * 1000; // 1 minute

async function fetchFinnhub(symbol: string) {
  try {
    const response = await axios.get(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 429) throw new Error("429");
    throw error;
  }
}

export async function runMarketScan() {
  const now = Date.now();
  
  // 1. Return cached data if it's less than 1 minute old
  if (cachedData && (now - lastScanTime < CACHE_DURATION)) {
    console.log("[Sentinel] Returning cached market data...");
    return cachedData;
  }

  const tickers = ['SPY', 'AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMD', 'GOOGL', 'AMZN', 'NFLX', 'META'];
  const results = [];

  console.log(`[Sentinel] Cache expired. Starting fresh scan with 1s throttling...`);

  for (const ticker of tickers) {
    try {
      const data = await fetchFinnhub(ticker);
      if (data && data.c) {
        results.push({
          ticker,
          price: data.c,
          change: data.d,
          percentChange: data.dp,
          timestamp: new Date().toISOString()
        });
      }
      // 2. Increase delay to 1000ms to be 100% safe on free tier
      await sleep(1000); 
    } catch (error: any) {
      if (error.message === "429") {
        console.error(`[Sentinel] Rate limit hit on ${ticker}. Stopping scan.`);
        break; // Stop scanning to let the API "cool down"
      }
      continue;
    }
  }

  // 3. Only update cache if we got actual results
  if (results.length > 0) {
    cachedData = results;
    lastScanTime = now;
    return results;
  }

  // 4. Ultimate Fallback: Return old cache even if expired, or empty array
  return cachedData || [];
}

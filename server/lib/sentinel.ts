import axios from 'axios';

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

let cachedData: any = null;
let lastScanTime = 0;
let isScanning = false; // New flag to prevent overlapping scans
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for stability

async function fetchFinnhub(symbol: string) {
  try {
    const response = await axios.get(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`,
      { timeout: 5000 }
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 429) throw new Error("429");
    throw error;
  }
}

export async function runMarketScan() {
  const now = Date.now();
  
  // 1. If we have ANY data, return it immediately to keep the UI alive
  if (cachedData && (now - lastScanTime < CACHE_DURATION)) {
    return cachedData;
  }

  // 2. If a scan is already running, don't start a new one; return old data or empty state
  if (isScanning) {
    return cachedData || [{ ticker: 'MARKET', price: 0, status: 'Initializing...' }];
  }

  // 3. Start scan in the background
  isScanning = true;
  const tickers = ['SPY', 'AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMD', 'GOOGL', 'AMZN', 'NFLX', 'META'];
  const results = [];

  console.log(`[Sentinel] Starting background scan...`);

  try {
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
        await sleep(1000); 
      } catch (e: any) {
        if (e.message === "429") break;
        continue;
      }
    }

    if (results.length > 0) {
      cachedData = results;
      lastScanTime = Date.now();
    }
  } finally {
    isScanning = false;
  }

  return cachedData || results;
}

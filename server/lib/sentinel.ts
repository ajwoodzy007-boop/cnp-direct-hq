import axios from 'axios';

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Persistence: Keep data across refreshes
let cachedData: any = null;
let lastScanTime = 0;
let isScanning = false; 

/**
 * runMarketScan
 * Designed to never block the main thread.
 */
export async function runMarketScan() {
  const now = Date.now();
  
  // 1. IMMEDIATE RETURN: If we have data, send it.
  if (cachedData && (now - lastScanTime < 300000)) { // 5 min cache
    return cachedData;
  }

  // 2. BACKGROUND TRIGGER: Start the scan but DON'T "await" it here.
  if (!isScanning) {
    performBackgroundScan(); 
  }

  // 3. INSTANT PLACEHOLDER: If no cache exists, send this immediately so the UI doesn't white-screen.
  return cachedData || [
    { ticker: 'SPY', price: 0, change: 0, percentChange: 0, status: 'Initializing' },
    { ticker: 'AAPL', price: 0, change: 0, percentChange: 0, status: 'Initializing' }
  ];
}

/**
 * Actual API Logic - runs "detached" from the request
 */
async function performBackgroundScan() {
  isScanning = true;
  console.log(`[Sentinel] Background scan started...`);
  
  const tickers = ['SPY', 'AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMD', 'GOOGL', 'AMZN', 'NFLX', 'META'];
  const results = [];

  try {
    for (const ticker of tickers) {
      try {
        const response = await axios.get(
          `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_KEY}`,
          { timeout: 5000 }
        );
        const data = response.data;
        if (data && data.c) {
          results.push({
            ticker,
            price: data.c,
            change: data.d,
            percentChange: data.dp,
            timestamp: new Date().toISOString()
          });
        }
        await sleep(1000); // 1s throttle
      } catch (e) {
        continue;
      }
    }

    if (results.length > 0) {
      cachedData = results;
      lastScanTime = Date.now();
      console.log(`[Sentinel] Background scan complete. Cache updated.`);
    }
  } finally {
    isScanning = false;
  }
}

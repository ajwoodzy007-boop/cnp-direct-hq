import axios from 'axios';

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// INITIAL PLACEHOLDER: Prevents frontend crashes on first load
let cachedData: any = [
  { ticker: 'SPY', price: 0, change: 0, percentChange: 0, timestamp: new Date().toISOString() },
  { ticker: 'AAPL', price: 0, change: 0, percentChange: 0, timestamp: new Date().toISOString() }
];
let isScanning = false;

export async function runMarketScan() {
  // Always return what we have IMMEDIATELY
  if (!isScanning) {
    performBackgroundScan();
  }
  return cachedData;
}

async function performBackgroundScan() {
  isScanning = true;
  const tickers = ['SPY', 'AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMD', 'GOOGL', 'AMZN', 'NFLX', 'META'];
  const results = [];

  try {
    for (const ticker of tickers) {
      try {
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
        await sleep(1000); 
      } catch (e) { continue; }
    }
    if (results.length > 0) cachedData = results;
  } finally {
    isScanning = false;
  }
}

import axios from 'axios';

// 1. Configuration
const FINNHUB_KEY = process.env.FINNHUB_API_KEY;

// Helper to pause execution to stay under Finnhub's free-tier rate limits
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * fetchFinnhub
 * Internal helper to handle the specific Finnhub quote API call
 */
async function fetchFinnhub(symbol: string) {
  try {
    const response = await axios.get(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 429) {
      throw new Error("Finnhub error: Too Many Requests");
    }
    throw error;
  }
}

/**
 * runMarketScan
 * The primary engine for the Market Sentinel dashboard
 */
export async function runMarketScan() {
  const tickers = ['SPY', 'AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMD', 'GOOGL', 'AMZN', 'NFLX', 'META'];
  const results = [];

  console.log(`[Sentinel] Scanning ${tickers.length} blue-chip tickers with 250ms throttling...`);

  // We use a sequential loop instead of Promise.all to prevent 429 Rate Limit crashes
  for (const ticker of tickers) {
    try {
      const data = await fetchFinnhub(ticker);
      
      // Ensure the API returned a valid current price ('c')
      if (data && data.c !== undefined) {
        results.push({
          ticker,
          price: data.c,
          change: data.d,
          percentChange: data.dp,
          timestamp: new Date().toISOString()
        });
      }

      // Pause briefly between each request to remain stable
      await sleep(250); 

    } catch (error: any) {
      console.error(`[Sentinel] Skipping ${ticker} due to error: ${error.message}`);
      // Continue to the next ticker so the whole service doesn't go offline
      continue; 
    }
  }

  // Fallback: If the API is completely blocked, return a placeholder to keep the UI from crashing
  if (results.length === 0) {
    return [{ 
      ticker: 'MARKET', 
      price: 0, 
      status: 'Service Throttled - Retrying in 60s' 
    }];
  }

  return results;
}

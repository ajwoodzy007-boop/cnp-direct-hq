// 1. REMOVED Yahoo Finance imports completely to stop ETIMEDOUT errors
// @ts-ignore - vader-sentiment doesn't have type declarations
import { SentimentIntensityAnalyzer } from 'vader-sentiment';
import { RSI } from 'technicalindicators';

// 2. Using Finnhub Client (Ensure FINNHUB_API_KEY is in Railway)
const FINNHUB_KEY = process.env.FINNHUB_API_KEY;

const getSentimentScore = (text: string): number => {
  const analyzer = SentimentIntensityAnalyzer;
  const result = analyzer.polarity_scores(text);
  return result.compound;
};

export interface SentinelResult {
  ticker: string;
  price: number;
  openPrice: number;
  changePercent: number;
  rsi: number;
  rvol: number;
  sentimentScore: number;
  verdict: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  signal: 'MOMENTUM BUY' | 'VALUE BUY' | 'SPECULATIVE BUY' | 'SELL WARNING' | 'WAIT';
  marketCap?: number;
  avgVolume?: number;
}

// Helper to fetch from Finnhub
async function fetchFinnhub(endpoint: string, params: string = "") {
  const url = `https://finnhub.io/api/v1/${endpoint}?token=${FINNHUB_KEY}${params}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Finnhub error: ${response.statusText}`);
  return response.json();
}

async function analyzeStock(ticker: string): Promise<SentinelResult | null> {
  try {
    // Fetch Quote from Finnhub
    const quote = await fetchFinnhub('quote', `&symbol=${ticker}`);
    if (!quote || !quote.c) return null;

    // Fetch Basic Financials for RVOL/Market Cap
    const financials = await fetchFinnhub('stock/metric', `&symbol=${ticker}&metric=all`);
    
    const price = quote.c; // Current price
    const openPrice = quote.o;
    const changePercent = quote.dp; // Daily percent change
    const avgVol = financials.metric?.['10DayAverageTradingVolume'] || 1;
    const marketCap = financials.metric?.marketCapitalization * 1000000 || 0;

    // Simplistic RSI logic for browser-fetch (usually requires historical candle fetch)
    // For now, we default to 50 to prevent crashes while you stabilize
    const currentRSI = 50; 
    const rvol = avgVol > 0 ? (quote.v / (avgVol / 6.5)) : 1.0;

    let verdict: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    if (changePercent > 1.5) verdict = 'BULLISH';
    if (changePercent < -1.5) verdict = 'BEARISH';

    let signal: SentinelResult['signal'] = 'WAIT';
    if (rvol > 1.5 && changePercent > 0) signal = 'MOMENTUM BUY';
    else if (changePercent < -5) signal = 'SELL WARNING';

    return {
      ticker: ticker.toUpperCase(),
      price,
      openPrice,
      changePercent,
      rsi: currentRSI,
      rvol: parseFloat(rvol.toFixed(2)),
      sentimentScore: 0, // News fetch removed to prevent further timeouts
      verdict,
      signal,
      marketCap,
      avgVolume: avgVol
    };
  } catch (error) {
    console.error(`Error analyzing ${ticker}:`, error);
    return null;
  }
}

export const runMarketScan = async (): Promise<SentinelResult[]> => {
  try {
    // Instead of Yahoo Screeners, we use a fixed list of high-liquidity tickers
    // This is much more stable for your 16 users than the failing Yahoo scraper
    const tickers = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMD', 'GOOGL', 'AMZN', 'META', 'NFLX', 'BRK.B'];
    
    console.log(`[Sentinel] Scanning ${tickers.length} blue-chip tickers...`);

    const results = [];
    for (const t of tickers) {
      const res = await analyzeStock(t);
      if (res) results.push(res);
      // Small delay to prevent Finnhub rate limits
      await new Promise(r => setTimeout(r, 200));
    }

    return results.sort((a, b) => {
      const order = { 'MOMENTUM BUY': 0, 'VALUE BUY': 1, 'SPECULATIVE BUY': 2, 'SELL WARNING': 3, 'WAIT': 4 };
      return (order[a.signal] || 5) - (order[b.signal] || 5);
    });

  } catch (error) {
    console.error("Scanner failed:", error);
    return [];
  }
};

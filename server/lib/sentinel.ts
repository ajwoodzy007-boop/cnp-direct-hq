import YahooFinanceDefault from 'yahoo-finance2';
// @ts-ignore - vader-sentiment doesn't have type declarations
import { SentimentIntensityAnalyzer } from 'vader-sentiment';
import { RSI } from 'technicalindicators';

// Handle both ESM (dev) and CJS (production) module formats
// Suppress validation warnings from yahoo-finance2
const YahooFinance = (YahooFinanceDefault as any).default || YahooFinanceDefault;
const yf = typeof YahooFinance === 'function' 
  ? new YahooFinance({ suppressNotices: ['yahooSurvey', 'rippieBird'] }) 
  : YahooFinance;
// Suppress validation errors globally
if (yf.setGlobalConfig) {
  yf.setGlobalConfig({ validation: { logErrors: false } });
}

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
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  sector?: string;
}

// Quality filter constants
const MIN_PRICE = 5;              // Exclude penny stocks < $5
const MIN_AVG_VOLUME = 300000;    // Minimum 300K daily average volume (lowered for mid-caps)
const MIN_MARKET_CAP = 200000000; // Minimum $200M market cap (lowered to include more small-caps)
const MAX_CHANGE_PERCENT = 40;    // Exclude extreme movers (potential manipulation)

// Known ETF/SPAC tickers and patterns to exclude
// Only explicit ETF tickers (not regex-based on suffix to avoid false positives like VRTX, CLDX)
const KNOWN_ETF_TICKERS = new Set([
  'SPY', 'QQQ', 'IWM', 'DIA', 'VTI', 'VOO', 'VEA', 'VWO', 'EFA', 'EEM',
  'XLF', 'XLE', 'XLK', 'XLV', 'XLI', 'XLY', 'XLP', 'XLB', 'XLU', 'XLRE',
  'ARKK', 'ARKG', 'ARKW', 'ARKF', 'GLD', 'SLV', 'USO', 'UNG', 'TLT', 'HYG',
  'SQQQ', 'TQQQ', 'SPXU', 'SPXL', 'SOXL', 'SOXS', 'LABU', 'LABD'
]);

const EXCLUDED_PATTERNS = [
  /SPAC|ACQ/i,       // SPACs
  /-WT$|-WS$/,       // Warrants
  /-UN$|-U$/,        // Units
  /^[A-Z]+\.WS$/,    // Warrants with dot notation
];

function isExcludedTicker(ticker: string, quoteType?: string): boolean {
  // Exclude ETFs based on quote type (most reliable)
  if (quoteType === 'ETF') return true;
  
  // Exclude known ETF tickers
  if (KNOWN_ETF_TICKERS.has(ticker.toUpperCase())) return true;
  
  // Check excluded patterns (warrants, units, SPACs)
  for (const pattern of EXCLUDED_PATTERNS) {
    if (pattern.test(ticker)) return true;
  }
  
  return false;
}

async function analyzeStock(ticker: string): Promise<SentinelResult | null> {
  try {
    const quote = await yf.quote(ticker) as any;
    if (!quote) return null;
    
    // === QUALITY FILTERS ===
    const price = quote.regularMarketPrice || 0;
    const avgVolume = quote.averageDailyVolume3Month || 0;
    const marketCap = quote.marketCap || 0;
    const changePercent = Math.abs(quote.regularMarketChangePercent || 0);
    const quoteType = quote.quoteType;
    
    // Filter 1: Exclude penny stocks
    if (price < MIN_PRICE) {
      console.log(`[Sentinel] Excluded ${ticker}: price $${price.toFixed(2)} < $${MIN_PRICE}`);
      return null;
    }
    
    // Filter 2: Exclude low volume stocks
    if (avgVolume < MIN_AVG_VOLUME) {
      console.log(`[Sentinel] Excluded ${ticker}: avg volume ${avgVolume.toLocaleString()} < ${MIN_AVG_VOLUME.toLocaleString()}`);
      return null;
    }
    
    // Filter 3: Exclude micro-cap stocks (if market cap available)
    if (marketCap > 0 && marketCap < MIN_MARKET_CAP) {
      console.log(`[Sentinel] Excluded ${ticker}: market cap $${(marketCap/1e6).toFixed(0)}M < $${MIN_MARKET_CAP/1e6}M`);
      return null;
    }
    
    // Filter 4: Exclude extreme movers (potential manipulation/news-driven spikes)
    if (changePercent > MAX_CHANGE_PERCENT) {
      console.log(`[Sentinel] Excluded ${ticker}: extreme move ${changePercent.toFixed(1)}% > ${MAX_CHANGE_PERCENT}%`);
      return null;
    }
    
    // Filter 5: Exclude ETFs, SPACs, warrants
    if (isExcludedTicker(ticker, quoteType)) {
      console.log(`[Sentinel] Excluded ${ticker}: ETF/SPAC/warrant`);
      return null;
    }
    
    const period1 = new Date();
    period1.setMonth(period1.getMonth() - 1);
    const chartData = await yf.chart(ticker, { 
      period1, 
      period2: new Date(),
      interval: '1d' 
    }) as any;
    const news = await yf.search(ticker, { newsCount: 5 }) as any;

    const history = chartData?.quotes || [];
    if (history.length < 15) return null;

    const closes = history.map((h: any) => h.close).filter((c: any) => c != null);
    const rsiValues = RSI.calculate({ values: closes, period: 14 });
    const currentRSI = rsiValues[rsiValues.length - 1] || 50;

    const currentVol = quote.regularMarketVolume || 0;
    const avgVol = quote.averageDailyVolume3Month || 1;
    const rvol = avgVol > 0 ? currentVol / avgVol : 1.0;

    let totalScore = 0;
    let articleCount = 0;

    if (news && news.news) {
      news.news.forEach((n: any) => {
        if (n.title) {
          totalScore += getSentimentScore(n.title);
          articleCount++;
        }
      });
    }
    
    const avgSentiment = articleCount > 0 ? totalScore / articleCount : 0;

    let verdict: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    if (avgSentiment >= 0.05) verdict = 'BULLISH';
    if (avgSentiment <= -0.05) verdict = 'BEARISH';

    let signal: SentinelResult['signal'] = 'WAIT';

    // TIGHTENED THRESHOLDS for higher win rate:
    // MOMENTUM BUY: High conviction - strong volume, positive sentiment, good RSI
    if (rvol > 1.5 && avgSentiment > 0.1 && currentRSI >= 45 && currentRSI <= 65) {
      signal = 'MOMENTUM BUY';
    }
    // VALUE BUY: Oversold with positive sentiment confirmation
    else if (currentRSI < 35 && avgSentiment > 0.1) {
      signal = 'VALUE BUY';
    }
    // SPECULATIVE BUY: Looser criteria (lower priority in selection)
    else if (rvol > 1.0 && avgSentiment >= 0 && currentRSI >= 40 && currentRSI <= 70) {
      signal = 'SPECULATIVE BUY';
    }
    else if (currentRSI > 80 || (avgSentiment <= -0.1 && quote.regularMarketChangePercent < -8)) {
      signal = 'SELL WARNING';
    }

    return {
      ticker: ticker.toUpperCase(),
      price: quote.regularMarketPrice || 0,
      openPrice: quote.regularMarketOpen || quote.regularMarketPrice || 0,
      changePercent: quote.regularMarketChangePercent || 0,
      rsi: Math.round(currentRSI),
      rvol: parseFloat(rvol.toFixed(2)),
      sentimentScore: parseFloat(avgSentiment.toFixed(2)),
      verdict,
      signal,
      marketCap: quote.marketCap || undefined,
      avgVolume: quote.averageDailyVolume3Month || undefined,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh || undefined,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow || undefined,
      sector: quote.sector || undefined
    };

  } catch (error) {
    console.error(`Error analyzing ${ticker}:`, error);
    return null;
  }
}

export const runMarketScan = async (): Promise<SentinelResult[]> => {
  try {
    // Scan more candidates since quality filters will reduce the pool
    // Also include most active stocks for better liquidity
    const [gainersResult, losersResult, activeResult] = await Promise.all([
      yf.screener({ scrIds: 'day_gainers', count: 15 }) as any,
      yf.screener({ scrIds: 'day_losers', count: 10 }) as any,
      yf.screener({ scrIds: 'most_actives', count: 10 }) as any
    ]);
    
    const gainerTickers = gainersResult.quotes
      .map((q: any) => q.symbol)
      .slice(0, 15);
    
    const loserTickers = losersResult.quotes
      .map((q: any) => q.symbol)
      .slice(0, 10);
    
    const activeTickers = (activeResult?.quotes || [])
      .map((q: any) => q.symbol)
      .slice(0, 10);
    
    // Combine and dedupe all sources
    const allTickers = Array.from(new Set([...gainerTickers, ...loserTickers, ...activeTickers]));
    console.log(`[Sentinel] Scanning ${allTickers.length} unique tickers...`);

    const promises = allTickers.map((t: string) => analyzeStock(t));
    const results = await Promise.all(promises);

    // Sort: BUY signals first, then WARNING, then WAIT
    const filtered = results.filter((r): r is SentinelResult => r !== null);
    console.log(`[Sentinel] ${filtered.length} stocks passed quality filters`);
    
    return filtered.sort((a, b) => {
      const order = { 'MOMENTUM BUY': 0, 'VALUE BUY': 1, 'SPECULATIVE BUY': 2, 'SELL WARNING': 3, 'WAIT': 4 };
      return (order[a.signal] || 5) - (order[b.signal] || 5);
    });

  } catch (error) {
    console.error("Scanner failed:", error);
    return [];
  }
};

import YahooFinanceDefault from 'yahoo-finance2';
// @ts-ignore - vader-sentiment doesn't have type declarations
import { SentimentIntensityAnalyzer } from 'vader-sentiment';
import { RSI } from 'technicalindicators';

// Handle both ESM (dev) and CJS (production) module formats
const YahooFinance = (YahooFinanceDefault as any).default || YahooFinanceDefault;
const yf = typeof YahooFinance === 'function' ? new YahooFinance() : YahooFinance;

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
}

async function analyzeStock(ticker: string): Promise<SentinelResult | null> {
  try {
    const quote = await yf.quote(ticker) as any;
    
    const period1 = new Date();
    period1.setMonth(period1.getMonth() - 1);
    const chartData = await yf.chart(ticker, { 
      period1, 
      period2: new Date(),
      interval: '1d' 
    }) as any;
    const news = await yf.search(ticker, { newsCount: 5 }) as any;

    const history = chartData?.quotes || [];
    if (!quote || history.length < 15) return null;

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
      signal
    };

  } catch (error) {
    console.error(`Error analyzing ${ticker}:`, error);
    return null;
  }
}

export const runMarketScan = async (): Promise<SentinelResult[]> => {
  try {
    // Scan both gainers (for BUY signals) and losers (for SELL WARNING signals)
    const [gainersResult, losersResult] = await Promise.all([
      yf.screener({ scrIds: 'day_gainers', count: 8 }) as any,
      yf.screener({ scrIds: 'day_losers', count: 5 }) as any
    ]);
    
    const gainerTickers = gainersResult.quotes
      .map((q: any) => q.symbol)
      .slice(0, 8);
    
    const loserTickers = losersResult.quotes
      .map((q: any) => q.symbol)
      .slice(0, 5);
    
    // Combine and dedupe
    const allTickers = Array.from(new Set([...gainerTickers, ...loserTickers]));

    const promises = allTickers.map((t: string) => analyzeStock(t));
    const results = await Promise.all(promises);

    // Sort: BUY signals first, then WARNING, then WAIT
    const filtered = results.filter((r): r is SentinelResult => r !== null);
    return filtered.sort((a, b) => {
      const order = { 'MOMENTUM BUY': 0, 'VALUE BUY': 1, 'SPECULATIVE BUY': 2, 'SELL WARNING': 3, 'WAIT': 4 };
      return (order[a.signal] || 5) - (order[b.signal] || 5);
    });

  } catch (error) {
    console.error("Scanner failed:", error);
    return [];
  }
};

import yf from 'yahoo-finance2';
// @ts-ignore - vader-sentiment doesn't have type declarations
import { SentimentIntensityAnalyzer } from 'vader-sentiment';
import { RSI } from 'technicalindicators';

const getSentimentScore = (text: string): number => {
  const analyzer = SentimentIntensityAnalyzer;
  const result = analyzer.polarity_scores(text);
  return result.compound;
};

export interface SentinelResult {
  ticker: string;
  price: number;
  changePercent: number;
  rsi: number;
  rvol: number;
  sentimentScore: number;
  verdict: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  signal: 'MOMENTUM BUY' | 'VALUE BUY' | 'SELL WARNING' | 'WAIT';
}

async function analyzeStock(ticker: string): Promise<SentinelResult | null> {
  try {
    const quote = await yf.quote(ticker) as any;
    const history = await yf.historical(ticker, { period1: '1mo', interval: '1d' }) as any[];
    const news = await yf.search(ticker, { newsCount: 5 }) as any;

    if (!quote || history.length < 15) return null;

    const closes = history.map((h: any) => h.close);
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

    if (rvol > 2.0 && avgSentiment > 0 && currentRSI < 85) {
      signal = 'MOMENTUM BUY';
    }
    else if (currentRSI < 35 && avgSentiment > -0.1) {
      signal = 'VALUE BUY';
    }
    else if (currentRSI > 80) {
      signal = 'SELL WARNING';
    }

    return {
      ticker: ticker.toUpperCase(),
      price: quote.regularMarketPrice || 0,
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
    const queryOptions = { count: 10, scrIds: 'day_gainers' };
    const screenerResult = await yf.screener(queryOptions) as any;
    
    const tickers = screenerResult.quotes
      .map((q: any) => q.symbol)
      .slice(0, 10);

    const promises = tickers.map((t: string) => analyzeStock(t));
    const results = await Promise.all(promises);

    return results.filter((r): r is SentinelResult => r !== null);

  } catch (error) {
    console.error("Scanner failed:", error);
    return [];
  }
};

import YahooFinanceDefault from 'yahoo-finance2';
import { RSI } from 'technicalindicators';

const YahooFinance = (YahooFinanceDefault as any).default || YahooFinanceDefault;
const yf = typeof YahooFinance === 'function' ? new YahooFinance() : YahooFinance;

const TOP_CRYPTOS = [
  'BTC-USD',
  'ETH-USD', 
  'SOL-USD',
  'XRP-USD',
  'DOGE-USD',
  'ADA-USD',
  'AVAX-USD',
  'LINK-USD',
  'DOT-USD',
  'MATIC-USD',
  'SHIB-USD',
  'LTC-USD',
  'UNI-USD',
  'ATOM-USD',
  'XLM-USD'
];

export interface CryptoResult {
  ticker: string;
  name: string;
  price: number;
  changePercent: number;
  rsi: number;
  rvol: number;
  marketCap: number;
  volume24h: number;
  verdict: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  signal: 'MOMENTUM BUY' | 'VALUE BUY' | 'SELL WARNING' | 'WAIT';
}

async function analyzeCrypto(ticker: string): Promise<CryptoResult | null> {
  try {
    const quote = await yf.quote(ticker) as any;
    
    const period1 = new Date();
    period1.setMonth(period1.getMonth() - 1);
    const chartData = await yf.chart(ticker, { 
      period1, 
      period2: new Date(),
      interval: '1d' 
    }) as any;

    const history = chartData?.quotes || [];
    if (!quote || history.length < 15) return null;

    const closes = history.map((h: any) => h.close).filter((c: any) => c != null);
    const rsiValues = RSI.calculate({ values: closes, period: 14 });
    const currentRSI = rsiValues[rsiValues.length - 1] || 50;

    const currentVol = quote.regularMarketVolume || 0;
    const avgVol = quote.averageDailyVolume10Day || 1;
    const rvol = avgVol > 0 ? currentVol / avgVol : 1.0;

    const changePercent = quote.regularMarketChangePercent || 0;

    let verdict: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    if (changePercent > 3 && currentRSI < 75) verdict = 'BULLISH';
    else if (changePercent < -3 || currentRSI > 80) verdict = 'BEARISH';
    else if (changePercent > 0) verdict = 'BULLISH';
    else if (changePercent < 0) verdict = 'BEARISH';

    let signal: CryptoResult['signal'] = 'WAIT';

    if (rvol > 1.5 && changePercent > 5 && currentRSI < 80) {
      signal = 'MOMENTUM BUY';
    }
    else if (currentRSI < 30) {
      signal = 'VALUE BUY';
    }
    else if (currentRSI > 85) {
      signal = 'SELL WARNING';
    }

    const displayName = ticker.replace('-USD', '');

    return {
      ticker: displayName,
      name: quote.shortName || quote.longName || displayName,
      price: quote.regularMarketPrice || 0,
      changePercent: changePercent,
      rsi: Math.round(currentRSI),
      rvol: parseFloat(rvol.toFixed(2)),
      marketCap: quote.marketCap || 0,
      volume24h: currentVol,
      verdict,
      signal
    };

  } catch (error) {
    console.error(`Error analyzing ${ticker}:`, error);
    return null;
  }
}

export const runCryptoScan = async (): Promise<CryptoResult[]> => {
  try {
    const promises = TOP_CRYPTOS.map((t: string) => analyzeCrypto(t));
    const results = await Promise.all(promises);

    return results
      .filter((r): r is CryptoResult => r !== null)
      .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));

  } catch (error) {
    console.error("Crypto scanner failed:", error);
    return [];
  }
};

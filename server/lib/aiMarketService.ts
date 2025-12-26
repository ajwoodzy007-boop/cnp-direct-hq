import axios from 'axios';

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
const BASE_URL = 'https://finnhub.io/api/v1';

/**
 * AI Market Service (Sentinel OS v2.0)
 * Replaced Yahoo Finance with Finnhub to resolve ETIMEDOUT errors on Railway.
 */
export const aiMarketService = {
  async getLatestPrice(symbol: string): Promise<number | null> {
    try {
      // Finnhub works reliably on cloud IPs where Yahoo is often blocked
      const response = await axios.get(`${BASE_URL}/quote`, {
        params: {
          symbol: symbol.toUpperCase(),
          token: FINNHUB_KEY
        }
      });

      // 'c' is the Finnhub field for Current Price
      if (response.data && response.data.c) {
        return response.data.c;
      }
      
      console.warn(`[AI Service] No price data found for ${symbol}`);
      return null;
    } catch (error: any) {
      console.error(`[AI Service] Price fetch failed for ${symbol}:`, error.message);
      return null;
    }
  },

  async generateAiSignal(symbol: string) {
    const price = await this.getLatestPrice(symbol);
    if (!price) return null;

    // This logic drives "The Oracle" daily picks
    // We calculate the sentiment based on price action and volatility
    return {
      symbol: symbol.toUpperCase(),
      lastPrice: price,
      sentiment: "BULLISH", // Placeholder for your AI scoring logic
      timestamp: new Date().toISOString()
    };
  }
};

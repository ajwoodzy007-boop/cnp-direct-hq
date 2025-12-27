// REMOVED Yahoo Finance imports completely to stop ETIMEDOUT and build errors
import { RSI } from 'technicalindicators';

/**
 * Crypto Scanner - Sanitized
 * Yahoo Finance "crumbs" were crashing crypto lookups.
 * We are returning an empty state to stabilize the build.
 * Future update will map this to a Crypto-specific API (like CoinGecko).
 */

export interface CryptoResult {
  ticker: string;
  price: number;
  change24h: number;
  rsi: number;
  verdict: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

export const runCryptoScan = async (): Promise<CryptoResult[]> => {
  try {
    console.log('[Crypto] Yahoo Finance disabled. Skipping scan to prevent build crash.');
    
    // Returning an empty array to prevent the dashboard from breaking
    return [];
  } catch (error) {
    console.error('[Crypto] Scanner failed:', error);
    return [];
  }
};

import { db } from '../db';
import { predictions } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import yahooFinance from 'yahoo-finance2';

function getTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface FinalizationResult {
  success: boolean;
  message: string;
  finalized: number;
  skipped?: number;
  errors?: string[];
  date: string;
}

export async function runStockFinalization(): Promise<FinalizationResult> {
  const today = getTodayDate();
  
  const todaysPredictions = await db.select().from(predictions)
    .where(sql`DATE(${predictions.predictionDate}) = ${today} AND (${predictions.assetType} = 'stock' OR ${predictions.assetType} IS NULL) AND (${predictions.outcome} IS NULL OR ${predictions.outcome} = '')`);
  
  console.log(`[Finalize] Found ${todaysPredictions.length} predictions to finalize for ${today}`);
  
  if (todaysPredictions.length === 0) {
    return { success: true, message: 'No predictions to finalize', finalized: 0, date: today };
  }
  
  const uniqueTickers = Array.from(new Set(todaysPredictions.map(p => p.ticker)));
  const closingPrices: Record<string, number> = {};
  const errors: string[] = [];
  
  const yf = typeof yahooFinance === 'function' ? new (yahooFinance as any)() : yahooFinance;
  
  for (const ticker of uniqueTickers) {
    try {
      const q = await yf.quote(ticker) as any;
      if (q?.regularMarketPrice && q.regularMarketPrice > 0) {
        closingPrices[ticker] = q.regularMarketPrice;
        console.log(`[Finalize] ${ticker}: $${q.regularMarketPrice} (quote)`);
      } else {
        const chart = await yf.chart(ticker, { period1: '1d', interval: '1d' });
        if (chart?.quotes?.length > 0) {
          const lastQuote = chart.quotes[chart.quotes.length - 1];
          closingPrices[ticker] = lastQuote.close || lastQuote.open || 0;
          console.log(`[Finalize] ${ticker}: $${closingPrices[ticker]} (chart fallback)`);
        } else {
          errors.push(`${ticker}: no data`);
          closingPrices[ticker] = 0;
        }
      }
    } catch (err: any) {
      errors.push(`${ticker}: ${err.message}`);
      closingPrices[ticker] = 0;
      console.error(`[Finalize] Error fetching ${ticker}:`, err.message);
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  let finalized = 0;
  let skipped = 0;
  for (const pred of todaysPredictions) {
    const closePrice = closingPrices[pred.ticker];
    if (closePrice <= 0) {
      skipped++;
      continue;
    }
    
    const profitPercent = ((closePrice - pred.entryPrice) / pred.entryPrice) * 100;
    const outcome = profitPercent > 0 ? 'win' : profitPercent < 0 ? 'loss' : 'neutral';
    
    await db.update(predictions)
      .set({
        outcomePrice: closePrice,
        outcome: outcome,
        outcomeDate: new Date()
      })
      .where(eq(predictions.id, pred.id));
    
    console.log(`[Finalize] ${pred.ticker}: $${pred.entryPrice} -> $${closePrice} = ${outcome} (${profitPercent.toFixed(2)}%)`);
    finalized++;
  }
  
  return { 
    success: true, 
    message: `Finalized ${finalized} predictions`,
    finalized,
    skipped,
    errors: errors.length > 0 ? errors : undefined,
    date: today
  };
}

export async function runCryptoFinalization(): Promise<FinalizationResult> {
  const today = getTodayDate();
  
  const todaysPredictions = await db.select().from(predictions)
    .where(sql`DATE(${predictions.predictionDate}) = ${today} AND ${predictions.assetType} = 'crypto' AND (${predictions.outcome} IS NULL OR ${predictions.outcome} = '')`);
  
  console.log(`[Finalize Crypto] Found ${todaysPredictions.length} crypto predictions to finalize for ${today}`);
  
  if (todaysPredictions.length === 0) {
    return { success: true, message: 'No crypto predictions to finalize', finalized: 0, date: today };
  }
  
  const uniqueTickers = Array.from(new Set(todaysPredictions.map(p => p.ticker)));
  const closingPrices: Record<string, number> = {};
  const errors: string[] = [];
  
  const yf = typeof yahooFinance === 'function' ? new (yahooFinance as any)() : yahooFinance;
  
  for (const ticker of uniqueTickers) {
    try {
      const yahooSymbol = `${ticker}-USD`;
      const q = await yf.quote(yahooSymbol) as any;
      if (q?.regularMarketPrice && q.regularMarketPrice > 0) {
        closingPrices[ticker] = q.regularMarketPrice;
        console.log(`[Finalize Crypto] ${ticker}: $${q.regularMarketPrice}`);
      } else {
        errors.push(`${ticker}: no data`);
        closingPrices[ticker] = 0;
      }
    } catch (err: any) {
      errors.push(`${ticker}: ${err.message}`);
      closingPrices[ticker] = 0;
      console.error(`[Finalize Crypto] Error fetching ${ticker}:`, err.message);
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  let finalized = 0;
  let skipped = 0;
  for (const pred of todaysPredictions) {
    const closePrice = closingPrices[pred.ticker];
    if (closePrice <= 0) {
      skipped++;
      continue;
    }
    
    const profitPercent = ((closePrice - pred.entryPrice) / pred.entryPrice) * 100;
    const outcome = profitPercent > 0 ? 'win' : profitPercent < 0 ? 'loss' : 'neutral';
    
    await db.update(predictions)
      .set({
        outcomePrice: closePrice,
        outcome: outcome,
        outcomeDate: new Date()
      })
      .where(eq(predictions.id, pred.id));
    
    console.log(`[Finalize Crypto] ${pred.ticker}: $${pred.entryPrice} -> $${closePrice} = ${outcome} (${profitPercent.toFixed(2)}%)`);
    finalized++;
  }
  
  return { 
    success: true, 
    message: `Finalized ${finalized} crypto predictions`,
    finalized,
    skipped,
    errors: errors.length > 0 ? errors : undefined,
    date: today
  };
}

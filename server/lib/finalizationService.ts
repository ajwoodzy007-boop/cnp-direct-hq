import { db } from "../db";
import { sql } from "drizzle-orm";
import { aiMarketService } from "./aiMarketService";

/**
 * BUSINESS LOGIC: Finalizes pending predictions
 * This is the "Engine" that proves the Win Rate to a buyer.
 */
export async function runStockFinalization() {
  console.log("[Finalizer] Starting automated outcome resolution...");

  try {
    // 1. Get all pending predictions from the patient-cake database
    const pending = await db.execute(sql`
      SELECT * FROM predictions 
      WHERE outcome = 'pending' 
      OR outcome IS NULL
    `);

    console.log(`[Finalizer] Processing ${pending.rows.length} records.`);

    for (const row of pending.rows) {
      try {
        // 2. Get the current real-time price via our Finnhub bridge
        const currentPrice = await aiMarketService.getLatestPrice(row.ticker);
        
        if (!currentPrice) {
          console.warn(`[Finalizer] Could not get price for ${row.ticker}, skipping.`);
          continue;
        }

        const entryPrice = Number(row.entry_price);
        const signalType = row.signal_type || "";
        
        let outcome = 'pending';
        
        // 3. Logic: Compare Entry vs Current Price
        // If it's a BUY signal, we win if currentPrice > entryPrice
        if (signalType.includes('BUY')) {
          outcome = currentPrice > entryPrice ? 'win' : 'loss';
        } 
        // If it's a SELL signal, we win if currentPrice < entryPrice
        else if (signalType.includes('SELL')) {
          outcome = currentPrice < entryPrice ? 'win' : 'loss';
        }

        // 4. Update the Database with the result
        await db.execute(sql`
          UPDATE predictions 
          SET outcome = ${outcome}, 
              outcome_price = ${currentPrice},
              outcome_date = NOW()
          WHERE id = ${row.id}
        `);

        console.log(`[Finalizer] ${row.ticker}: ${outcome.toUpperCase()} (Entry: ${entryPrice} | Current: ${currentPrice})`);
      } catch (err) {
        console.error(`[Finalizer] Failed processing ${row.ticker}:`, err);
      }
    }

    return { success: true, processed: pending.rows.length };
  } catch (error) {
    console.error("[Finalizer] Critical Execution Error:", error);
    throw error;
  }
}

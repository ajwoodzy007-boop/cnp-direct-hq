import { db } from "../db";
import { sql } from "drizzle-orm";
import { aiMarketService } from "./aiMarketService";

/**
 * CORE BUSINESS ENGINE: Finalizes pending predictions.
 * Essential for proving AI accuracy to potential buyers.
 */
export async function runStockFinalization() {
  console.log("[Finalizer] Starting automated outcome resolution...");

  try {
    // 1. Fetch all predictions that haven't been resolved yet
    const pending = await db.execute(sql`
      SELECT * FROM predictions 
      WHERE outcome = 'pending' 
      OR outcome IS NULL
    `);

    console.log(`[Finalizer] Found ${pending.rows.length} pending records.`);

    for (const row of pending.rows) {
      try {
        // 2. Fetch the current market price via the Finnhub API bridge
        const currentPrice = await aiMarketService.getLatestPrice(row.ticker);
        
        if (!currentPrice) {
          console.warn(`[Finalizer] Price fetch failed for ${row.ticker}. Skipping.`);
          continue;
        }

        const entryPrice = Number(row.entry_price);
        const signalType = row.signal_type || "";
        let outcome = 'pending';
        
        // 3. Mathematical Outcome Calculation
        // BUY Logic: Win if current price is higher than entry
        if (signalType.includes('BUY')) {
          outcome = currentPrice > entryPrice ? 'win' : 'loss';
        } 
        // SELL Logic: Win if current price is lower than entry
        else if (signalType.includes('SELL')) {
          outcome = currentPrice < entryPrice ? 'win' : 'loss';
        }

        // 4. Update the Neon Database with the final result
        await db.execute(sql`
          UPDATE predictions 
          SET outcome = ${outcome}, 
              outcome_price = ${currentPrice},
              outcome_date = NOW()
          WHERE id = ${row.id}
        `);

        console.log(`[Finalizer] Resolved ${row.ticker}: ${outcome.toUpperCase()}`);
      } catch (err) {
        console.error(`[Finalizer] Error processing ticker ${row.ticker}:`, err);
      }
    }

    return { success: true, processed: pending.rows.length };
  } catch (error) {
    console.error("[Finalizer] Critical Failure:", error);
    throw error;
  }
}

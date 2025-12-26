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
    // 1. Get all pending predictions
    const pending = await db.execute(sql`
      SELECT * FROM predictions 
      WHERE outcome = 'pending' 
      OR outcome IS NULL
    `);

    console.log(`[Finalizer] Processing ${pending.rows.length} records.`);

    for (const row of pending.rows) {
      try {
        // 2. Get the current real-time price via Finnhub
        const currentPrice = await aiMarketService.getLatestPrice(row.ticker);
        
        if (!currentPrice) continue;

        const entryPrice = Number(row.entry_price);
        const signalType = row.signal_type; // e.g., 'AUTO:BUY'
        
        let outcome = 'pending';
        
        // 3. Logic: Did it go up or down?
        if (signalType.includes('BUY')) {
          outcome = currentPrice > entryPrice ? 'win' : 'loss';
        } else {
          outcome = currentPrice < entryPrice ? 'win' : 'loss';
        }

        // 4. Update the Database
        await db.execute(sql`
          UPDATE predictions 
          SET outcome = ${outcome}, 
              outcome_price = ${currentPrice},
              outcome_date = NOW()
          WHERE id = ${row.id}
        `);

        console.log(`[Finalizer] ${row.ticker}: ${outcome.toUpperCase()} at $${currentPrice}`);
      } catch (err) {
        console.error(`[Finalizer] Failed ${row.ticker}:`, err);
      }
    }

    return { success: true, processed: pending.rows.length };
  } catch (error) {
    console.error("[Finalizer] Critical Error:", error);
    throw error;
  }
}

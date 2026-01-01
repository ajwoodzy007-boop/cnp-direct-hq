import { db } from "../db";
import { historicalPrices } from "../../shared/schema";
import axios from "axios";

export async function refreshHistoricalData() {
  const ALPHA_KEY = process.env.ALPHA_VANTAGE_API_KEY;
  const tickers = ['SPY', 'QQQ', 'AAPL', 'NVDA', 'TSLA', 'MSFT', 'AMD', 'BTC'];

  console.log("🕵️ [Watchman] Starting manual vault sync...");
  
  for (const ticker of tickers) {
    try {
      const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${ticker}&apikey=${ALPHA_KEY}`;
      const response = await axios.get(url);
      const data = response.data["Time Series (Daily)"];

      if (!data) {
        console.warn(`⚠️ [Watchman] No data for ${ticker}. (API Limit?)`);
        continue;
      }

      const latestDateStr = Object.keys(data)[0];
      const entry = data[latestDateStr];

      await db.insert(historicalPrices).values({
        ticker: ticker,
        date: latestDateStr,
        open_price: entry["1. open"],
        high_price: entry["2. high"],
        low_price: entry["3. low"],
        close_price: entry["4. close"],
        volume: Number(entry["5. volume"])
      }).onConflictDoNothing(); 

      console.log(`✅ [Watchman] ${ticker} synced.`);
    } catch (e) {
      console.error(`❌ [Watchman] ${ticker} failed:`, e);
    }
  }
  console.log("🏁 [Watchman] Sync complete.");
}

// --- ADD THIS TO THE BOTTOM ---
// This ensures the function runs when called via terminal
refreshHistoricalData().catch(console.error);
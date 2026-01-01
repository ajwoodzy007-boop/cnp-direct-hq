import 'dotenv/config';
import axios from 'axios';
import * as dbModule from "../db"; 
import * as schema from "../../shared/schema";

const AV_KEY = process.env.ALPHAVANTAGE_API_KEY;
const db = (dbModule as any).db;

async function seedHistoricalData() {
  if (!AV_KEY) {
    console.error("❌ KEY ERROR: ALPHAVANTAGE_API_KEY not found in .env.");
    return;
  }

  const WATCHLIST = ['SPY', 'QQQ', 'AAPL', 'TSLA', 'NVDA'];
  console.log("🚀 Starting Precision Ingestion via AlphaVantage...");

  for (const ticker of WATCHLIST) {
    try {
      console.log(`[Seed] Fetching: ${ticker}`);
      const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${ticker}&apikey=${AV_KEY}`;
      const response = await axios.get(url);
      
      const timeSeries = response.data["Time Series (Daily)"];
      if (timeSeries) {
        const dates = Object.keys(timeSeries);
        console.log(`📊 Processing ${dates.length} days for ${ticker}...`);

        for (const dateStr of dates) {
          const dayData = timeSeries[dateStr];
          
          try {
            await db.insert(schema.historicalPrices).values({
              ticker: ticker,
              date: dateStr,
              // Convert strings to Numbers to match Neon "numeric" type
              open_price: Number(dayData["1. open"]).toFixed(2),
              high_price: Number(dayData["2. high"]).toFixed(2),
              low_price: Number(dayData["3. low"]).toFixed(2),
              close_price: Number(dayData["4. close"]).toFixed(2),
              volume: Math.floor(Number(dayData["5. volume"] || 0))
            }).onConflictDoNothing();
          } catch (insertErr) {
            // Silently catch individual row errors to keep the script moving
          }
        }
        console.log(`✅ ${ticker} sync complete.`);
      }

      // Mandatory cooldown for AlphaVantage Free Tier
      console.log("⏳ Waiting 20s for next ticker...");
      await new Promise(resolve => setTimeout(resolve, 20000));

    } catch (error: any) {
      console.error(`❌ Error seeding ${ticker}:`, error.message);
    }
  }
  console.log("\n🎯 2026 Baseline Established. Neon is populated.");
  process.exit(0);
}

seedHistoricalData();
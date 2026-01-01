import type { Express } from "express";
import { createServer, type Server } from "http";
import { runDailyScan } from "./lib/sentinel";
import { db } from "./db";
import { historicalPrices } from "../shared/schema";
import { eq, desc } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // 1. UNIVERSAL CHART ROUTE - Handles multiple formats
  // Supports:
  // - /api/chart?ticker=SPY (Query parameter format)
  // - /api/market/chart/SPY (Path parameter format - preferred)
  app.get("/api/chart", async (req, res) => {
    try {
      const ticker = (req.query.ticker as string)?.toUpperCase();
      if (!ticker) {
        return res.status(400).json({ success: false, message: "No ticker provided in query parameter" });
      }
      console.log(`📡 [Sentinel] Fetching chart data for: ${ticker} (query format)`);
      
      const data = await db
        .select()
        .from(historicalPrices)
        .where(eq(historicalPrices.ticker, ticker))
        .orderBy(desc(historicalPrices.date))
        .limit(30);

      res.json({ 
        success: true, 
        data: data.map(d => ({
          date: d.date,
          close: parseFloat(d.close_price || "0")
        })).reverse() 
      });
    } catch (error) {
      console.error("Chart Error:", error);
      res.status(500).json({ success: false, message: "Database access error" });
    }
  });

  app.get("/api/market/chart/:ticker", async (req, res) => {
    try {
      // Path parameter format: /api/market/chart/SPY
      const ticker = req.params.ticker?.toUpperCase();
      
      if (!ticker) {
        return res.status(400).json({ success: false, message: "No ticker provided in path parameter" });
      }

      console.log(`📡 [Sentinel] Fetching chart data for: ${ticker} (path format)`);

      const data = await db
        .select()
        .from(historicalPrices)
        .where(eq(historicalPrices.ticker, ticker))
        .orderBy(desc(historicalPrices.date))
        .limit(30);

      // We reverse it so the chart draws from Left (Oldest) to Right (Newest)
      res.json({ 
        success: true, 
        data: data.map(d => ({
          date: d.date,
          close: parseFloat(d.close_price || "0")
        })).reverse() 
      });
    } catch (error) {
      console.error("Chart Error:", error);
      res.status(500).json({ success: false, message: "Database access error" });
    }
  });

  // 2. MARKET RADAR FEED
  app.get("/api/market/radar", async (_req, res) => {
    try {
      const data = await runDailyScan();
      res.json({
        atmosphere: {
          bias: "Neutral",
          lastUpdated: new Date().toISOString()
        },
        movers: data
      });
    } catch (error) {
      console.error("Radar Error:", error);
      res.status(500).json({ message: "Radar offline" });
    }
  });

  // 3. ACADEMY BRIEFING (Stops the briefing 404)
  app.get(["/api/academy/briefing", "/api/briefing"], (_req, res) => {
    res.json({
      success: true,
      data: {
        date: new Date().toLocaleDateString(),
        headline: "Sentinel Intelligence Live",
        summary: "Neural market scan complete. Historical data indexed.",
        sentiment: "NEUTRAL"
      }
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
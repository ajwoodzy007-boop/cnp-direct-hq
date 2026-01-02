import type { Express } from "express";
import { createServer, type Server } from "http";
import { runDailyScan } from "./lib/sentinel";
import { db } from "./db";
import { historicalPrices, users } from "../shared/schema"; // ⚡ THE FIX: Relative path instead of @ alias
import { eq, desc } from "drizzle-orm";
import { setupAuth } from "./auth";
import adminRoutes from "./routes/admin";
import oracleRoutes from "./routes/oracle";
import strategistRoutes from "./routes/strategist";
import vaultRoutes from "./routes/vault";
import marketRoutes from "./routes/market";
import top10Routes from "./routes/top10";
import userRoutes from "./routes/user";
import aiRoutes from "./routes/ai";
import academyRoutes from "./routes/academy";
import { requireAdmin } from "./middleware/admin";
import { requirePremium } from "./middleware/premium"; 

export async function registerRoutes(app: Express): Promise<Server> {
  
  // 1. INITIALIZE AUTHENTICATION (The Login Door)
  // This registers the POST /api/login and GET /api/user routes.
  // It MUST be at the top to prevent 404s on login.
  setupAuth(app);

  // 1.4. GLOBAL ROUTE LOGGING
  app.use((req, res, next) => {
    console.log('--- ROUTE HIT: ' + req.path + ' ---');
    next();
  });

  // 1.5. MOUNT ROUTE MODULES
  // Admin routes require authentication and admin privileges
  app.use("/api/admin", requireAdmin, adminRoutes);

  // Premium routes require premium subscription
  app.use("/api/oracle", requirePremium, oracleRoutes);
  app.use("/api/vault", requirePremium, vaultRoutes);

  // General routes (may have internal auth checks)
  app.use("/api/market", marketRoutes);
  app.use("/api/top10", top10Routes);
  app.use("/api/user", userRoutes);
  app.use("/api/strategist", strategistRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/academy", academyRoutes);

  // 2. RAILWAY HEALTHCHECK
  // Confirms the server is breathing on Railway
  app.get("/api/health", (_req, res) => {
    console.log('--- HEALTH CHECK HIT ---');
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // 2.1. TEST ROUTE - For debugging API connectivity
  app.get("/api/test", (_req, res) => {
    console.log('--- TEST ROUTE HIT ---');
    res.json({
      message: "API is working!",
      timestamp: new Date().toISOString(),
      environment: app.get("env")
    });
  });

  // 3. UNIVERSAL CHART ROUTE
  // Serves stock data to StockChart.tsx
  app.get(["/api/chart", "/api/market/chart/:ticker"], async (req, res) => {
    try {
      const ticker = (req.query.ticker as string || req.params.ticker)?.toUpperCase();
      if (!ticker) {
        return res.status(400).json({ success: false, message: "No ticker provided" });
      }

      console.log(`📡 [Sentinel] Fetching data for: ${ticker}`);

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

  // 4. MARKET RADAR FEED
  // Provides the ticker list and price changes
  app.get("/api/market/radar", async (_req, res) => {
    try {
      const data = await runDailyScan();
      res.json({
        atmosphere: { bias: "Neutral", lastUpdated: new Date().toISOString() },
        movers: data
      });
    } catch (error) {
      console.error("Radar Error:", error);
      res.status(500).json({ message: "Radar offline" });
    }
  });

  // 5. ACADEMY BRIEFING
  // Serves the AI summary at the top of the Radar
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
import type { Express } from "express";
import { getStorage } from "./storage.js";
import adminRouter from "./routes/admin.js";
import oracleRouter from "./routes/oracle.js";
import marketRouter from "./routes/market.js";
import backtestRouter from "./routes/backtest.js";

export function registerRoutes(app: Express) {
  // ============================================
  // CORE MIDDLEWARE & ROUTERS
  // ============================================
  
  // Register routers
  app.use("/api/admin", adminRouter);
  app.use("/api/oracle", oracleRouter);
  app.use("/api/market", marketRouter);
  app.use("/api/backtest", backtestRouter);

  // ============================================
  // SYSTEM & AI CONTROLS (NEW FOR 2026)
  // ============================================

  // POST /api/admin/trigger-scan - Force the AI to scan the market now
  app.post("/api/admin/trigger-scan", async (req, res) => {
    // Cast req.user to any to bypass the TypeScript 'isAdmin' property error
    const user = req.user as any;
    
    if (!req.isAuthenticated() || !user?.isAdmin) {
      return res.status(403).json({ success: false, error: "Admin access required" });
    }

    try {
      console.log("[Admin] Manual Sentinel Scan Triggered for 2026...");
      
      // We import as any to bypass the strict property check on the dynamic import
      const sentinel = await import("./lib/sentinel.js") as any;
      
      // Access the function handling both named and default exports
      const scanFn = sentinel.runDailyScan || sentinel.default?.runDailyScan;
      
      if (typeof scanFn !== 'function') {
        throw new Error("runDailyScan function not found in sentinel.js");
      }

      // Run the scan in the background
      scanFn()
        .then(() => console.log("[Sentinel] Manual Scan Completed Successfully"))
        .catch((err: any) => console.error("[Sentinel] Manual Scan Failed:", err));
      
      res.json({ 
        success: true, 
        message: "Sentinel scan initiated. Check the Oracle in ~60 seconds." 
      });
    } catch (error: any) {
      console.error("Trigger Error:", error);
      res.status(500).json({ success: false, error: "Could not start sentinel: " + error.message });
    }
  });

  // Simple Health Check for Railway Deployment
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", time: new Date().toISOString(), version: "1.0.1-resilient" });
  });

  // ============================================
  // VALUATION & PREDICTION DATA
  // ============================================

  // Valuation Endpoint
  app.get("/api/valuation/:ticker", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { ticker } = req.params;
    res.json({
      symbol: ticker.toUpperCase(),
      price: 172.10,
      intrinsicValue: 184.50,
      signal: "BUY",
      confidence: 92
    });
  });

  // GET /api/predictions - Get recent predictions
  app.get("/api/predictions", async (req, res) => {
    try {
      const storage = getStorage();
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      
      const predictions = await storage.getPredictions(limit, offset);
      
      res.json({
        success: true,
        data: predictions
      });
    } catch (error: any) {
      console.error("Error fetching predictions:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/market/top10-today - Get latest predictions
  app.get("/api/market/top10-today", async (req, res) => {
    try {
      const storage = getStorage();
      const today = new Date().toISOString().split('T')[0];
      
      const predictions = await storage.getPredictions(20, 0);
      
      const top10 = predictions
        .sort((a: any, b: any) => (b.confidenceScore || 0) - (a.confidenceScore || 0))
        .slice(0, 10);

      res.json({
        success: true,
        data: {
          date: today,
          picks: top10,
          marketOpen: true,
          isAfterHours: false
        }
      });
    } catch (error: any) {
      console.error("Error fetching top10 today:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/top10/stats - Prediction Win/Loss Statistics
  app.get("/api/top10/stats", async (req, res) => {
    try {
      const storage = getStorage();
      const wins = await storage.getPredictionsByOutcome('win');
      const losses = await storage.getPredictionsByOutcome('loss');
      const total = wins.length + losses.length;
      const winRate = total > 0 ? (wins.length / total) * 100 : 0;
      
      res.json({
        success: true,
        data: {
          winRate: Math.round(winRate * 10) / 10,
          totalPredictions: total,
          wins: wins.length,
          losses: losses.length
        }
      });
    } catch (error: any) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/top10/history - Historical logs grouped by date
  app.get("/api/top10/history", async (req, res) => {
    try {
      const storage = getStorage();
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 30;
      const allPredictions = await storage.getPredictions(limit * 10, 0);
      
      const groupedByDate = allPredictions.reduce((acc: any, pred: any) => {
        const date = new Date(pred.predictionDate).toISOString().split('T')[0];
        if (!acc[date]) acc[date] = [];
        acc[date].push(pred);
        return acc;
      }, {});

      const history = Object.entries(groupedByDate)
        .slice(0, limit)
        .map(([date, entries]: [string, any]) => ({
          date,
          entries: entries.map((e: any) => ({
            ticker: e.ticker,
            entryPrice: e.entryPrice,
            signal: e.signal,
            outcome: e.outcome,
            profitPercent: e.profitPercent
          }))
        }));

      res.json({ success: true, data: history });
    } catch (error: any) {
      console.error("Error fetching history:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
}
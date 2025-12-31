import type { Express } from "express";
import { getStorage } from "./storage.js";
import adminRouter from "./routes/admin.js";

export function registerRoutes(app: Express) {
  // Register admin routes
  app.use("/api/admin", adminRouter);
  // Note: setupAuth is called in index.ts before registerRoutes
  // This prevents duplicate route registration

  // API Health Check (also defined in index.ts, but kept here for backward compatibility)
  // The one in index.ts takes precedence since it's registered first

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

  // ============================================
  // PREDICTION ROUTES - Using predictions table
  // ============================================

  // GET /api/predictions - Get all predictions from predictions table
  app.get("/api/predictions", async (req, res) => {
    try {
      const storage = getStorage();
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
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

  // GET /api/market/top10-today - Get today's top predictions from predictions table
  app.get("/api/market/top10-today", async (req, res) => {
    try {
      const storage = getStorage();
      const today = new Date().toISOString().split('T')[0];
      
      // Get today's predictions from predictions table
      const predictions = await storage.getPredictionsByDate(today);
      
      // Sort by confidence/RSI and take top 10
      const top10 = predictions
        .sort((a: any, b: any) => {
          // Sort by confidence score or RSI
          const aScore = a.confidenceScore || a.rsi || 0;
          const bScore = b.confidenceScore || b.rsi || 0;
          return bScore - aScore;
        })
        .slice(0, 10);

      res.json({
        success: true,
        data: {
          date: today,
          picks: top10,
          marketOpen: true, // You may want to calculate this based on market hours
          isAfterHours: false
        }
      });
    } catch (error: any) {
      console.error("Error fetching top10 today:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/top10/stats - Get prediction statistics from predictions table
  app.get("/api/top10/stats", async (req, res) => {
    try {
      const storage = getStorage();
      
      // Get all resolved predictions (win/loss)
      const wins = await storage.getPredictionsByOutcome('win');
      const losses = await storage.getPredictionsByOutcome('loss');
      const total = wins.length + losses.length;
      
      const winRate = total > 0 ? (wins.length / total) * 100 : 0;
      
      res.json({
        success: true,
        data: {
          winRate: Math.round(winRate * 10) / 10, // Round to 1 decimal
          totalPredictions: total,
          wins: wins.length,
          losses: losses.length
        }
      });
    } catch (error: any) {
      console.error("Error fetching prediction stats:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/top10/history - Get historical prediction runs
  app.get("/api/top10/history", async (req, res) => {
    try {
      const storage = getStorage();
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 30;
      
      // Get recent predictions grouped by date
      const allPredictions = await storage.getPredictions(limit * 10, 0); // Get more to group by date
      
      // Group by prediction date
      const groupedByDate = allPredictions.reduce((acc: any, pred: any) => {
        const date = new Date(pred.predictionDate).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(pred);
        return acc;
      }, {});

      // Convert to array format expected by frontend
      const history = Object.entries(groupedByDate)
        .slice(0, limit)
        .map(([date, entries]: [string, any]) => ({
          date,
          entries: entries.map((e: any) => ({
            ticker: e.ticker,
            entryPrice: e.entryPrice,
            openPrice: e.openPrice,
            closePrice: e.closePrice,
            currentPrice: e.currentPrice,
            predictedPrice: e.predictedPrice,
            signal: e.signal,
            outcome: e.outcome,
            closePnl: e.closePnl,
            totalPnl: e.totalPnl
          }))
        }));

      res.json({
        success: true,
        data: history
      });
    } catch (error: any) {
      console.error("Error fetching prediction history:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
}

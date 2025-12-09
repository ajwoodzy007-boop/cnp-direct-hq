import type { Express } from "express";
import { createServer, type Server } from "http";
import { scanMarket, getChartData, getNews } from "./lib/marketData";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // GET /api/market/scan - Scan market for gainers/losers
  app.get("/api/market/scan", async (req, res) => {
    try {
      const data = scanMarket();
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: "Failed to scan market data" 
      });
    }
  });

  // GET /api/market/chart/:ticker - Get chart data for a ticker
  app.get("/api/market/chart/:ticker", async (req, res) => {
    try {
      const { ticker } = req.params;
      const period = (req.query.period as "1d" | "1w" | "1m" | "3m") || "3m";
      
      const data = getChartData(ticker.toUpperCase(), period);
      res.json({ success: true, ticker, period, data });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: "Failed to fetch chart data" 
      });
    }
  });

  // GET /api/market/news/:ticker - Get news for a ticker
  app.get("/api/market/news/:ticker", async (req, res) => {
    try {
      const { ticker } = req.params;
      const data = getNews(ticker.toUpperCase());
      res.json({ success: true, ticker, data });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: "Failed to fetch news data" 
      });
    }
  });

  return httpServer;
}

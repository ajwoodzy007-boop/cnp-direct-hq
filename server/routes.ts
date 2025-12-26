import type { Express } from "express";
import { createServer, type Server } from "http";
import { scanMarket, getChartData, getNews, getSentimentTrend } from "./lib/marketData";
import { runMarketScan as runSentinelScan } from "./lib/sentinel";
import { runCryptoScan } from "./lib/cryptoScanner";
import { storage } from "./storage";
import { query } from "./db";
import { insertPredictionSchema, insertWatchlistSchema } from "@shared/schema";
import OpenAI from "openai";
import { z } from "zod";
import { stripeService } from "./stripeService";
import { getStripePublishableKey } from "./stripeClient";
import { aiMarketService } from "./lib/aiMarketService"; // New Finnhub Service

// Route Imports
import oracleRouter from "./routes/oracle";
import strategistRouter from "./routes/strategist";
import vaultRouter from "./routes/vault";
import chartRouter from "./routes/chart";
import stripeRouter from "./routes/stripe";
import aiRouter from "./routes/ai";
import academyRouter from "./routes/academy";
import backtestRouter from "./routes/backtest";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // 1. Feature Routes
  app.use("/api/oracle", oracleRouter);
  app.use("/api/strategist", strategistRouter);
  app.use("/api/vault", vaultRouter);
  app.use("/api/chart", chartRouter);
  app.use("/api/stripe", stripeRouter);
  app.use("/api/ai", aiRouter);
  app.use("/api/academy", academyRouter);
  app.use("/api/backtest", backtestRouter);

  // 2. Portfolio Summary (FINNHUB FIXED)
  app.get("/api/portfolio/summary", async (req, res) => {
    try {
      const holdings = await query(`SELECT * FROM portfolio WHERE status = 'OPEN'`);
      if (holdings.rows.length === 0) return res.json({ summary: null });
      
      let totalValue = 0;
      let totalCost = 0;
      let topHolding: { ticker: string; value: number } | null = null;
      
      for (const h of holdings.rows) {
        try {
          const currentPrice = await aiMarketService.getLatestPrice(h.ticker);
          if (!currentPrice) continue;

          const shares = parseFloat(h.shares) || 0;
          const entryPrice = parseFloat(h.entryPrice || h.entryprice) || 0;
          const value = currentPrice * shares;
          const cost = entryPrice * shares;
          
          totalValue += value;
          totalCost += cost;
          if (!topHolding || value > topHolding.value) topHolding = { ticker: h.ticker, value };
        } catch (e: any) {
          console.warn(`[Summary] Skipped ${h.ticker}: ${e.message}`);
        }
      }
      
      res.json({
        summary: {
          totalValue,
          dayChange: totalValue - totalCost,
          dayChangePercent: totalCost > 0 ? ((totalValue - totalCost) / totalCost * 100) : 0,
          topHolding
        }
      });
    } catch (error) {
      console.error("Portfolio summary error:", error);
      res.json({ summary: null });
    }
  });

  // 3. Market Scan (FINNHUB FIXED)
  app.get("/api/market/scan", async (req, res) => {
    try {
      const data = await scanMarket(); // Ensure this lib is updated to Finnhub
      res.json({ success: true, data: Array.isArray(data) ? data : [] });
    } catch (error) {
      console.error("Market scan error:", error);
      res.status(500).json({ success: false, data: [] });
    }
  });

  // 4. Sentinel Scanner (FINNHUB FIXED)
  app.get("/api/market/sentinel", async (req, res) => {
    try {
      const results = await runSentinelScan();
      res.json({ success: true, count: results.length, data: results });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Sentinel Scan Failed' });
    }
  });

  // 5. Prediction History & Stats
  app.get("/api/top10/stats", async (req, res) => {
    try {
      const stats = await storage.getDailyPredictionStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to get stats" });
    }
  });

  return httpServer;
}

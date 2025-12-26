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
import { aiMarketService } from "./lib/aiMarketService"; // Import our new Finnhub service

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
  
  // Standard Routes
  app.use("/api/oracle", oracleRouter);
  app.use("/api/strategist", strategistRouter);
  app.use("/api/vault", vaultRouter);
  app.use("/api/chart", chartRouter);
  app.use("/api/stripe", stripeRouter);
  app.use("/api/ai", aiRouter);
  app.use("/api/academy", academyRouter);
  app.use("/api/backtest", backtestRouter);

  /**
   * PORTFOLIO SUMMARY
   * Fixed: Removed 'yahoo-finance2' and switched to our stable Finnhub service.
   */
  app.get("/api/portfolio/summary", async (req, res) => {
    try {
      const holdings = await query(
        `SELECT * FROM portfolio WHERE status = $1`,
        ['OPEN']
      );

      if (holdings.rows.length === 0) {
        return res.json({ summary: null });
      }
      
      let totalValue = 0;
      let totalCost = 0;
      let topHolding: { ticker: string; value: number } | null = null;
      
      for (const h of holdings.rows) {
        try {
          // Use our new resilient market service
          const currentPrice = await aiMarketService.getLatestPrice(h.ticker);
          if (!currentPrice) continue;

          const shares = parseFloat(h.shares) || 0;
          const entryPrice = parseFloat(h.entryPrice || h.entryprice) || 0;
          
          const value = currentPrice * shares;
          const cost = entryPrice * shares;
          
          totalValue += value;
          totalCost += cost;
          
          if (!topHolding || value > topHolding.value) {
            topHolding = { ticker: h.ticker, value };
          }
        } catch (e: any) {
          console.warn(`[Summary] Skip ${h.ticker}: ${e.message}`);
        }
      }
      
      const dayChange = totalValue - totalCost;
      const dayChangePercent = totalCost > 0 ? (dayChange / totalCost * 100) : 0;
      
      res.json({
        summary: { totalValue, dayChange, dayChangePercent, topHolding }
      });
    } catch (error) {
      console.error("Portfolio summary error:", error);
      res.json({ summary: null });
    }
  });

  // REST OF YOUR ROUTES (scanMarket, sentinel, etc.) continue here...
  // Ensure they all reference the updated lib/marketData or aiMarketService.

  return httpServer;
}

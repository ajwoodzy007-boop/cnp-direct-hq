import type { Express } from "express";
import { storage } from "./storage.js";
import { setupAuth } from "./auth.js";

export function registerRoutes(app: Express) {
  // Setup Auth first
  setupAuth(app);

  // API Health Check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "online", system: "Sentinel OS" });
  });

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
}
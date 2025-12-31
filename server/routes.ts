import type { Express } from "express";

export function registerRoutes(app: Express) {
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
}
import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth.js";
import { storage } from "./storage.js";

export function registerRoutes(app: Express): Server {
  // Setup the Auth routes (login, logout, user)
  setupAuth(app);

  // Define API routes
  app.get("/api/health", (_req, res) => {
    res.json({ status: "online", system: "Sentinel OS" });
  });

  // Basic search/valuation endpoint
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

  // Create the HTTP server and RETURN it
  const httpServer = createServer(app);
  return httpServer;
}
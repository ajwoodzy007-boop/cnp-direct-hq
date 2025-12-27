import type { Express } from "express";
import { createServer, type Server } from "http";
import authRouter from "./routes/auth";
import oracleRouter from "./routes/oracle";
import chartRouter from "./routes/chart";
import aiRouter from "./routes/ai";
import strategistRouter from "./routes/strategist";
import academyRouter from "./routes/academy";
import backtestRouter from "./routes/backtest";
import stripeRouter from "./routes/stripe";
import adminRouter from "./routes/admin";

export async function registerRoutes(app: Express): Promise<Server> {
  // 1. Core Auth (Login/Register)
  app.use("/api/auth", authRouter);

  // 2. The Sentinel & Market Data (Fixes "Sentinel Offline")
  // We map both /api/oracle and /api/market to the oracleRouter
  app.use("/api/oracle", oracleRouter);
  app.use("/api/market", oracleRouter); 

  // 3. Charts & Analytics
  app.use("/api/chart", chartRouter);

  // 4. AI & Strategist Features
  app.use("/api/ai", aiRouter);
  app.use("/api/strategist", strategistRouter);

  // 5. Education & Backtesting
  app.use("/api/academy", academyRouter);
  app.use("/api/backtest", backtestRouter);

  // 6. Payments & Admin
  app.use("/api/stripe", stripeRouter);
  app.use("/api/admin", adminRouter);

  const httpServer = createServer(app);
  return httpServer;
}

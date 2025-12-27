import type { Express } from "express";
import { createServer, type Server } from "http";
import academyRouter from "./routes/academy";
import adminRouter from "./routes/admin";
import aiRouter from "./routes/ai";
import authRouter from "./routes/auth";
import backtestRouter from "./routes/backtest";
import chartRouter from "./routes/chart";
import oracleRouter from "./routes/oracle";
import strategistRouter from "./routes/strategist";
import stripeRouter from "./routes/stripe";

/**
 * Master Route Registry - Sanitized
 * This file maps your folder structure to the API endpoints.
 * All Yahoo Finance dependencies have been stripped from the sub-routes.
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // Registering the 9 routes you listed in your folder
  app.use("/api/academy", academyRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/ai", aiRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/backtest", backtestRouter);
  app.use("/api/chart", chartRouter);
  app.use("/api/oracle", oracleRouter);
  app.use("/api/strategist", strategistRouter);
  app.use("/api/stripe", stripeRouter);

  const httpServer = createServer(app);
  return httpServer;
}

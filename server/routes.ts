import type { Express } from "express";
import { createServer, type Server } from "http";
import authRouter from "./routes/auth";
import oracleRouter from "./routes/oracle";
import chartRouter from "./routes/chart";
import academyRouter from "./routes/academy"; // The fix for your Briefing [cite: 5]

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes 
  app.use("/api/auth", authRouter);

  // Market & Sentinel routes (Movers, Today's Picks, etc.) [cite: 5]
  app.use("/api/market", oracleRouter);
  app.use("/api/oracle", oracleRouter);
  app.use("/api/sentinel", oracleRouter);

  // Chart data routes 
  app.use("/api/chart", chartRouter);
  app.use("/api/charts", chartRouter);

  // Academy & Briefing routes (The "CONNECTING..." fix) [cite: 5]
  app.use("/api/academy", academyRouter);

  const httpServer = createServer(app);
  return httpServer;
}

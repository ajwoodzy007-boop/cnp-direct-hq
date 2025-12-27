import type { Express } from "express";
import { createServer, type Server } from "http";
import authRouter from "./routes/auth";
import oracleRouter from "./routes/oracle";
import chartRouter from "./routes/chart";

export async function registerRoutes(app: Express): Promise<Server> {
  // 1. Authentication
  app.use("/api/auth", authRouter);

  // 2. Market Data & Sentinel Aliases
  // This maps multiple paths to the same logic to prevent frontend 404 crashes
  app.use("/api/oracle", oracleRouter);
  app.use("/api/market", oracleRouter); 
  app.use("/api/sentinel", oracleRouter);

  // 3. Chart Data Aliases
  app.use("/api/chart", chartRouter);
  app.use("/api/charts", chartRouter);

  const httpServer = createServer(app);
  return httpServer;
}

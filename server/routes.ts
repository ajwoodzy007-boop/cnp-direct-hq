import type { Express } from "express";
import { createServer, type Server } from "http";
import authRouter from "./routes/auth";
import oracleRouter from "./routes/oracle";
import chartRouter from "./routes/chart";

export async function registerRoutes(app: Express): Promise<Server> {
  // 1. Auth routes
  app.use("/api/auth", authRouter);

  // 2. Catch-all for all market/oracle/sentinel requests
  // This ensures the frontend ALWAYS finds a valid JSON response
  app.use("/api/market", oracleRouter);
  app.use("/api/oracle", oracleRouter);
  app.use("/api/sentinel", oracleRouter);

  // 3. Charts
  app.use("/api/chart", chartRouter);

  const httpServer = createServer(app);
  return httpServer;
}

import type { Express } from "express";
import { createServer, type Server } from "http";
import authRouter from "./routes/auth";
import oracleRouter from "./routes/oracle";
import chartRouter from "./routes/chart";
import academyRouter from "./routes/academy";

export async function registerRoutes(app: Express): Promise<Server> {
  // 1. Authentication Routes
  app.use("/api/auth", authRouter);

  // 2. Market Sentinel Aliases (Clears the "Offline" Error)
  // We mount the oracleRouter to every path the frontend pings
  app.use("/api/market", oracleRouter);   // Modern path
  app.use("/api/sentinel", oracleRouter); // Legacy path often used for health checks
  app.use("/api/oracle", oracleRouter);   // Backup path
  app.use("/api/status", oracleRouter);   // Direct status check path

  // 3. Chart & Intelligence Routes
  app.use("/api/chart", chartRouter);
  app.use("/api/charts", chartRouter);
  app.use("/api/academy", academyRouter);

  const httpServer = createServer(app);
  return httpServer;
}

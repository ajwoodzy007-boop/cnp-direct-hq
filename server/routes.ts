import type { Express } from "express";
import { createServer, type Server } from "http";
import authRouter from "./routes/auth";
import oracleRouter from "./routes/oracle";
import chartRouter from "./routes/chart";
import academyRouter from "./routes/academy";

export async function registerRoutes(app: Express): Promise<Server> {
  // 1. Identity & Permissions
  app.use("/api/auth", authRouter);

  // 2. Market Intelligence & Health Checks (Clears 'Sentinel Offline')
  app.use("/api/market", oracleRouter);
  app.use("/api/sentinel", oracleRouter);
  app.use("/api/oracle", oracleRouter);
  app.use("/api/status", oracleRouter);

  // 3. Reports & Charts
  app.use("/api/chart", chartRouter);
  app.use("/api/charts", chartRouter);
  app.use("/api/academy", academyRouter);

  const httpServer = createServer(app);
  return httpServer;
}

import type { Express } from "express";
import { createServer, type Server } from "http";
import authRouter from "./routes/auth";
import oracleRouter from "./routes/oracle";
import chartRouter from "./routes/chart";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication
  app.use("/api/auth", authRouter);

  // Market & Sentinel (Catches all variations)
  app.use("/api/market", oracleRouter);
  app.use("/api/oracle", oracleRouter);
  app.use("/api/sentinel", oracleRouter);

  // Charts
  app.use("/api/chart", chartRouter);
  app.use("/api/charts", chartRouter);

  const httpServer = createServer(app);
  return httpServer;
}

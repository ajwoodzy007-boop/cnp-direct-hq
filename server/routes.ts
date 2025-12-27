import type { Express } from "express";
import { createServer, type Server } from "http";
import authRouter from "./routes/auth";
import oracleRouter from "./routes/oracle";
import chartRouter from "./routes/chart";

export async function registerRoutes(app: Express): Promise<Server> {
  app.use("/api/auth", authRouter);

  // MARKET & SENTINEL: Map all variations to oracleRouter
  app.use("/api/market", oracleRouter);
  app.use("/api/oracle", oracleRouter);
  app.use("/api/sentinel", oracleRouter);

  // CHARTS: Map all variations to chartRouter
  app.use("/api/chart", chartRouter);
  app.use("/api/charts", chartRouter);

  const httpServer = createServer(app);
  return httpServer;
}

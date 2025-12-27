import type { Express } from "express";
import { createServer, type Server } from "http";
import authRouter from "./routes/auth";
import oracleRouter from "./routes/oracle";
import chartRouter from "./routes/chart";

export async function registerRoutes(app: Express): Promise<Server> {
  app.use("/api/auth", authRouter);

  // Wildcard catch-all for anything market related
  app.use("/api/market", oracleRouter);
  app.use("/api/oracle", oracleRouter);
  app.use("/api/sentinel", oracleRouter);

  app.use("/api/chart", chartRouter);

  const httpServer = createServer(app);
  return httpServer;
}

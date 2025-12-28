import type { Express } from "express";
import { createServer, type Server } from "http";
import authRouter from "./routes/auth";
import oracleRouter from "./routes/oracle";
import chartRouter from "./routes/chart";

export async function registerRoutes(app: Express): Promise<Server> {
  // 1. Auth Logic (We just updated auth.ts, so this is now solid)
  app.use("/api/auth", authRouter);

  // 2. The "Everything" Market Router
  // We map all common variations to oracleRouter to prevent 404/Offline errors
  app.use("/api/market", oracleRouter); 
  app.use("/api/oracle", oracleRouter);
  app.use("/api/sentinel", oracleRouter);

  // 3. Charts
  app.use("/api/chart", chartRouter);

  const httpServer = createServer(app);
  return httpServer;
}

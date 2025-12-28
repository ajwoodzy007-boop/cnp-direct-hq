import type { Express } from "express";
import { createServer, type Server } from "http";
import authRouter from "./routes/auth";
import oracleRouter from "./routes/oracle";
import chartRouter from "./routes/chart";
import academyRouter from "./routes/academy";
import adminRouter from "./routes/admin";

export async function registerRoutes(app: Express): Promise<Server> {
  // 1. Identity & Auth
  app.use("/api/auth", authRouter);

  // 2. Market Sentinel Intelligence (Movers & Today's Picks)
  // Handles /api/market/sentinel and health checks
  app.use("/api/market", oracleRouter);
  app.use("/api/sentinel", oracleRouter);
  app.use("/api/oracle", oracleRouter);

  // 3. ADMIN HQ (Stats & User Management)
  // We mount adminRouter to /api/admin AND /api/market/stats 
  // to catch the specific call shown in your logs
  app.use("/api/admin", adminRouter);
  app.use("/api/market/stats", adminRouter); 

  // 4. Reports & Charts
  app.use("/api/chart", chartRouter);
  app.use("/api/charts", chartRouter);
  app.use("/api/academy", academyRouter);

  const httpServer = createServer(app);
  return httpServer;
}

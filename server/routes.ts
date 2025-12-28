import type { Express } from "express";
import { createServer, type Server } from "http";
import authRouter from "./routes/auth";
import oracleRouter from "./routes/oracle";
import chartRouter from "./routes/chart";
import academyRouter from "./routes/academy";
import adminRouter from "./routes/admin";

export async function registerRoutes(app: Express): Promise<Server> {
  // CRITICAL: API routes MUST come before any static file handling
  
  // 1. Admin HQ Data (Catches the /api/admin/stats and /api/market/stats calls)
  app.use("/api/admin", adminRouter);
  app.use("/api/market/stats", adminRouter); 

  // 2. Identity & Authentication
  app.use("/api/auth", authRouter);

  // 3. Market Intelligence & Sentinel Health
  app.use("/api/market", oracleRouter);
  app.use("/api/sentinel", oracleRouter);
  app.use("/api/oracle", oracleRouter);

  // 4. Reports & Charts
  app.use("/api/chart", chartRouter);
  app.use("/api/charts", chartRouter);
  app.use("/api/academy", academyRouter);

  const httpServer = createServer(app);
  return httpServer;
}

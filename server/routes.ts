import type { Express } from "express";
import { createServer, type Server } from "http";
import authRouter from "./routes/auth";
import oracleRouter from "./routes/oracle";
import chartRouter from "./routes/chart";
import academyRouter from "./routes/academy";
import adminRouter from "./routes/admin";

export async function registerRoutes(app: Express): Promise<Server> {
  // FORCE API CONTENT TYPE FOR ALL /api PATHS
  // This prevents the HTML "index.html" response you keep seeing
  app.all('/api/*', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  });

  // 1. Admin HQ Data (This MUST be first)
  // Maps the calls from image_9d18ec.png to the adminRouter
  app.use("/api/admin", adminRouter);
  app.use("/api/market/stats", adminRouter); 
  app.use("/api/diagnostics", adminRouter); // Catches the diagnostics call

  // 2. Identity & Auth
  app.use("/api/auth", authRouter);

  // 3. Market Intelligence & Health
  app.use("/api/market", oracleRouter);
  app.use("/api/sentinel", oracleRouter);

  // 4. Reports & Charts
  app.use("/api/chart", chartRouter);
  app.use("/api/academy", academyRouter);

  const httpServer = createServer(app);
  return httpServer;
}

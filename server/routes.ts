import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import authRouter from "./routes/auth";
import oracleRouter from "./routes/oracle";
import chartRouter from "./routes/chart";
import academyRouter from "./routes/academy";
import adminRouter from "./routes/admin";

export async function registerRoutes(app: Express): Promise<Server> {
  // 1. FORCE JSON HEADER FOR ALL API CALLS
  // This kills the HTML response issue
  app.use("/api", (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  });

  // 2. ADMIN & DIAGNOSTICS (Must be at the top)
  // Handles the calls from image_9d18ec.png
  app.use("/api/admin", adminRouter);
  app.use("/api/market/stats", adminRouter);
  app.use("/api/diagnostics", adminRouter); 

  // 3. AUTH & IDENTITY
  app.use("/api/auth", authRouter);

  // 4. MARKET INTELLIGENCE
  app.use("/api/market", oracleRouter);
  app.use("/api/sentinel", oracleRouter);

  // 5. ACADEMY & CHARTS
  app.use("/api/chart", chartRouter);
  app.use("/api/academy", academyRouter);

  const httpServer = createServer(app);
  return httpServer;
}

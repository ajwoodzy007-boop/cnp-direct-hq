import type { Express } from "express";
import { createServer, type Server } from "http";
import academyRouter from "./routes/academy";
import adminRouter from "./routes/admin";
import aiRouter from "./routes/ai";
import authRouter from "./routes/auth";
import backtestRouter from "./routes/backtest";
import chartRouter from "./routes/chart";
import oracleRouter from "./routes/oracle"; // Ensure this matches the file name
import strategistRouter from "./routes/strategist";
import stripeRouter from "./routes/stripe";

export async function registerRoutes(app: Express): Promise<Server> {
  // Mapping the API to the sanitized files
  app.use("/api/academy", academyRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/ai", aiRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/backtest", backtestRouter);
  app.use("/api/chart", chartRouter);
  app.use("/api/oracle", oracleRouter); 
  app.use("/api/strategist", strategistRouter);
  app.use("/api/stripe", stripeRouter);

  // Fallback for the "Sentinel" specific endpoint if your frontend calls it directly
  app.use("/api/market/sentinel", oracleRouter);

  const httpServer = createServer(app);
  return httpServer;
}

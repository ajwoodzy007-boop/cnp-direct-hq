import type { Express } from "express";
import { createServer, type Server } from "http";
import authRouter from "./routes/auth";
import oracleRouter from "./routes/oracle";
import chartRouter from "./routes/chart";
import academyRouter from "./routes/academy";
import adminRouter from "./routes/admin"; // Add this import

export async function registerRoutes(app: Express): Promise<Server> {
  app.use("/api/auth", authRouter);
  app.use("/api/market", oracleRouter);
  app.use("/api/sentinel", oracleRouter);
  app.use("/api/chart", chartRouter);
  app.use("/api/academy", academyRouter);
  
  // REGISTER THE ADMIN ROUTE
  app.use("/api/admin", adminRouter); 

  const httpServer = createServer(app);
  return httpServer;
}

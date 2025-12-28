import type { Express } from "express";
import { createServer, type Server } from "http";
import authRouter from "./routes/auth";
import adminRouter from "./routes/admin";

export async function registerRoutes(app: Express): Promise<Server> {
  // Mount auth at /api so /api/login and /api/user are valid paths
  app.use("/api", authRouter);
  
  // Mount admin at /api/admin
  app.use("/api/admin", adminRouter);

  const httpServer = createServer(app);
  return httpServer;
}

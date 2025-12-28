import type { Express } from "express";
import { createServer, type Server } from "http";
import authRouter from "./routes/auth";
import adminRouter from "./routes/admin";

export async function registerRoutes(app: Express): Promise<Server> {
  // Mount the auth router directly at /api
  // This ensures /api/login, /api/user, and /api/logout all work.
  app.use("/api", authRouter);
  
  // Mount the admin router
  app.use("/api/admin", adminRouter);

  const httpServer = createServer(app);
  return httpServer;
}

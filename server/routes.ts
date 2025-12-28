import type { Express } from "express";
import { createServer, type Server } from "http";
import authRouter from "./routes/auth";
import adminRouter from "./routes/admin";

export async function registerRoutes(app: Express): Promise<Server> {
  // Mount auth routes directly under /api (matches /api/login, /api/user)
  app.use("/api", authRouter);
  
  // Mount admin routes under /api/admin (matches /api/admin/stats)
  app.use("/api/admin", adminRouter);

  const httpServer = createServer(app);
  return httpServer;
}

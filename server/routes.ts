import type { Express } from "express";
import { createServer, type Server } from "http";
import authRouter from "./routes/auth";
import adminRouter from "./routes/admin";

export async function registerRoutes(app: Express): Promise<Server> {
  // Mount auth routes directly under /api to match your frontend calls
  app.use("/api", authRouter);
  
  // Mount admin routes
  app.use("/api/admin", adminRouter);

  const httpServer = createServer(app);
  return httpServer;
}

import type { Express } from "express";
import { createServer, type Server } from "http";
import authRouter from "./routes/auth";
import adminRouter from "./routes/admin";
// Import other routers as needed

export async function registerRoutes(app: Express): Promise<Server> {
  // Mount the auth router
  app.use("/api/auth", authRouter);
  
  // Mount the admin router
  app.use("/api/admin", adminRouter);

  const httpServer = createServer(app);
  return httpServer;
}

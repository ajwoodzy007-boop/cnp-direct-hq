import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request Logger for debugging Railway hits
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

(async () => {
  try {
    // This now works because registerRoutes is explicitly exported in routes.ts
    const server = await registerRoutes(app);

    // Global Error Handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      throw err;
    });

    // Handle Vite development vs Production static serving
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ⚡ CRITICAL FOR RAILWAY: Bind to 0.0.0.0 and use process.env.PORT
    const PORT = Number(process.env.PORT) || 5000;
    server.listen(PORT, "0.0.0.0", () => {
      log(`🚀 Sentinel Systems Live on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ CRITICAL SERVER STARTUP ERROR:");
    console.error(error);
    
    // Emergency fallback to keep healthcheck alive if main server fails to boot
    const emergencyApp = express();
    emergencyApp.get("/api/health", (_req, res) => res.json({ status: "degraded" }));
    emergencyApp.listen(Number(process.env.PORT) || 5000, "0.0.0.0");
  }
})();
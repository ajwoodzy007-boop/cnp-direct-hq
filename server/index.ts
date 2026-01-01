import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupAuth } from "./auth";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ⚡ THE FIX FOR RAILWAY: Trust the proxy so cookies work
app.set("trust proxy", 1);

// Request Logger for debugging
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
    // Setup authentication before routes
    await setupAuth(app);
    
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      throw err;
    });

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const PORT = Number(process.env.PORT) || 5000;
    server.listen(PORT, "0.0.0.0", () => {
      log(`🚀 Sentinel Systems Live on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ CRITICAL SERVER STARTUP ERROR:");
    console.error(error);
    
    const emergencyApp = express();
    emergencyApp.set("trust proxy", 1);
    emergencyApp.get("/api/health", (_req, res) => res.json({ status: "degraded" }));
    emergencyApp.listen(Number(process.env.PORT) || 5000, "0.0.0.0");
  }
})();

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import nodeCron from "node-cron";
import { runDailyScan } from "./lib/sentinel";
import { refreshHistoricalData } from "./scripts/watchman";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Logger middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let resBody: any = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    resBody = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (resBody) {
        logLine += ` :: ${JSON.stringify(resBody)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Global error handler
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

  const PORT = 5000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`🚀 Sentinel Systems Live on port ${PORT}`);
  });

  // --- AUTOMATION SCHEDULER ---
  
  // 1. Every Morning at 9:00 AM: Sync history to Neon
  nodeCron.schedule("0 9 * * *", () => {
    console.log("⏰ [Automator] Triggering Watchman Sync...");
    refreshHistoricalData();
  });

  // 2. Every Hour: Run the Sentinel Technical Analysis
  nodeCron.schedule("0 * * * *", () => {
    console.log("⏰ [Automator] Triggering Sentinel Brain Scan...");
    runDailyScan();
  });

  // 3. Initial Boot Scan: Run once on startup so the cache isn't empty
  runDailyScan();
})();
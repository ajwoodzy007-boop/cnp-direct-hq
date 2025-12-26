import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { WebhookHandlers } from "./webhookHandlers";
import authRouter from "./routes/auth";
import adminRouter from "./routes/admin";
import { initDb } from "./db";
import { runStockFinalization } from "./lib/finalizationService";

const app = express();
const httpServer = createServer(app);

// Helper for professional logging in Railway
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true,
    timeZone: "America/New_York"
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// 1. STRIPE WEBHOOK ROUTE (Must be before express.json)
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature) return res.status(400).json({ error: "Missing stripe-signature" });

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      await WebhookHandlers.processWebhook(req.body as Buffer, sig, process.env.STRIPE_WEBHOOK_SECRET!);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error("Webhook error:", error.message);
      res.status(400).json({ error: "Webhook processing error" });
    }
  }
);

// 2. STANDARD MIDDLEWARE
app.use(express.json({
  verify: (req, _res, buf) => { req.rawBody = buf; },
}));
app.use(express.urlencoded({ extended: false }));
app.set('trust proxy', 1);

// 3. SESSION MANAGEMENT
app.use(session({
  secret: process.env.SESSION_SECRET || 'sentinel-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// 4. API ROUTES
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);

// 5. REQUEST LOGGING (Business Intelligence Tracking)
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`, "express");
    }
  });
  next();
});

/**
 * 6. AUTOMATED BUSINESS SCHEDULER
 * This makes the app a "Turnkey Asset" for buyers.
 * Handles Generation at 09:00 ET and Finalization at 16:30 ET.
 */
function startPredictionScheduler() {
  const port = process.env.PORT || 5000;
  
  const checkAndTriggerPredictions = async () => {
    const now = new Date();
    // Normalize to Eastern Time regardless of server location
    const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const hour = etTime.getHours();
    const minute = etTime.getMinutes();
    const day = etTime.getDay();
    const isWeekday = day >= 1 && day <= 5; 

    // TRIGGER 1: 09:00 AM ET - Oracle Signal Generation
    if (isWeekday && hour === 9 && minute === 0) {
      try {
        log("Executing scheduled 9:00 AM Generation...", "scheduler");
        await fetch(`http://localhost:${port}/api/oracle/daily?refresh=true`);
        log("SUCCESS: 9:00 AM Daily Picks Generated.", "scheduler");
      } catch (e) { 
        log(`CRITICAL: 9:00 AM Generation Failed: ${e}`, "scheduler"); 
      }
    }
    
    // TRIGGER 2: 04:30 PM ET (16:30) - Outcome Finalization
    if (isWeekday && hour === 16 && minute === 30) {
      try {
        log("Executing scheduled 4:30 PM Finalization...", "scheduler");
        await runStockFinalization();
        log("SUCCESS: 4:30 PM Outcomes Recorded to Database.", "scheduler");
      } catch (e) { 
        log(`CRITICAL: 4:30 PM Finalization Failed: ${e}`, "scheduler"); 
      }
    }
  };
  
  // Check every minute
  setInterval(checkAndTriggerPredictions, 60 * 1000);
  log("Scheduler Active: Monitoring 09:00 and 16:30 ET windows", "scheduler");
}

// 7. SERVER INITIALIZATION
(async () => {
  await initDb();
  await registerRoutes(httpServer, app);

  // Global Error Handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    res.status(err.status || 500).json({ message: err.message || "Internal Server Error" });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen({ port, host: "0.0.0.0" }, () => {
    log(`Sentinel OS serving on port ${port}`);
    // Delay scheduler start to ensure database and routes are fully ready
    setTimeout(() => startPredictionScheduler(), 10000);
  });
})();

import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { WebhookHandlers } from "./webhookHandlers";
import authRouter from "./routes/auth";
import adminRouter from "./routes/admin";
import { initDb } from "./db";
import { runStockFinalization, runCryptoFinalization } from "./lib/finalizationService";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// STRIPE WEBHOOK ROUTE - Must be BEFORE express.json()
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      return res.status(400).json({ error: "Missing stripe-signature" });
    }

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      // Using the Railway Environment Variable directly
      await WebhookHandlers.processWebhook(req.body as Buffer, sig, process.env.STRIPE_WEBHOOK_SECRET!);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error("Webhook error:", error.message);
      res.status(400).json({ error: "Webhook processing error" });
    }
  }
);

// Standard Middlewares
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));
app.set('trust proxy', 1);

const sessionSecret = process.env.SESSION_SECRET;
app.use(session({
  secret: sessionSecret || 'temporary-dev-only-not-for-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Auth & Admin Routes
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;
  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`, "express");
    }
  });
  next();
});

// Scheduler for daily predictions
function startPredictionScheduler() {
  const port = process.env.PORT || 5000;
  const checkAndTriggerPredictions = async () => {
    const now = new Date();
    const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const hour = etTime.getHours();
    const minute = etTime.getMinutes();
    const day = etTime.getDay();
    const isWeekday = day >= 1 && day <= 5;
    
    // 9:00 AM ET - Stock Predictions
    if (isWeekday && hour === 9 && minute === 0) {
      try {
        await fetch(`http://localhost:${port}/api/oracle/daily?refresh=true`);
        log("9:00 AM Predictions Triggered", "scheduler");
      } catch (e) { log(`Error: ${e}`, "scheduler"); }
    }
    
    // 4:15 PM ET - Finalize Stocks
    if (isWeekday && hour === 16 && minute === 15) {
      await runStockFinalization();
      log("4:15 PM Finalization Triggered", "scheduler");
    }
  };
  
  const checkInterval = process.env.NODE_ENV === "production" ? 60 * 60 * 1000 : 60 * 1000;
  setInterval(checkAndTriggerPredictions, checkInterval);
}

(async () => {
  await initDb();
  await registerRoutes(httpServer, app);

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
    log(`serving on port ${port}`);
    setTimeout(() => startPredictionScheduler(), 5000);
  });
})();

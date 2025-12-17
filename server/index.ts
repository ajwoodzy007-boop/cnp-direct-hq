import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./stripeClient";
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

let stripeInitialized = false;

async function checkStripeSchemaExists(): Promise<boolean> {
  try {
    const { db } = await import("./db");
    const { sql } = await import("drizzle-orm");
    const result = await db.execute(
      sql`SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'stripe')`
    );
    return result.rows[0]?.exists === true;
  } catch {
    return false;
  }
}

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log("DATABASE_URL not set, skipping Stripe initialization");
    return;
  }

  try {
    const schemaExists = await checkStripeSchemaExists();
    
    if (!schemaExists) {
      console.log("Initializing Stripe schema...");
      try {
        await runMigrations({ databaseUrl });
        console.log("Stripe schema created");
      } catch (migrationError: any) {
        console.error("Stripe migration error:", migrationError.message);
        console.log("Continuing without Stripe schema - payments may not work");
        return;
      }
    } else {
      console.log("Stripe schema already exists, skipping migrations");
    }

    const stripeSync = await getStripeSync();

    console.log("Setting up managed webhook...");
    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
    const { webhook } = await stripeSync.findOrCreateManagedWebhook(
      `${webhookBaseUrl}/api/stripe/webhook`,
      { enabled_events: ["*"], description: "Pro Trader Dashboard webhook" }
    );
    console.log(`Webhook configured: ${webhook.url}`);

    // Skip Stripe sync for now - there's a missing customer issue
    // TODO: Clean up stripe.customers table to remove deleted customers
    console.log("Stripe sync skipped - webhook ready for new events");
    
    stripeInitialized = true;
  } catch (error: any) {
    console.error("Failed to initialize Stripe:", error.message);
    console.log("Payments will be unavailable until Stripe is configured");
  }
}

// Stripe init disabled temporarily to fix deployment
// TODO: Re-enable after cleaning up stripe.customers table
// setTimeout(() => initStripe().catch(console.error), 2000);
console.log("Stripe initialization skipped - see TODO in server/index.ts");

// Health check endpoint for deployment
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post(
  "/api/stripe/webhook/:uuid",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      return res.status(400).json({ error: "Missing stripe-signature" });
    }

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      const { uuid } = req.params;
      await WebhookHandlers.processWebhook(req.body as Buffer, sig, uuid);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error("Webhook error:", error.message);
      res.status(400).json({ error: "Webhook processing error" });
    }
  }
);

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// Trust proxy for Replit HTTPS
app.set('trust proxy', 1);

// Session middleware - requires SESSION_SECRET environment variable
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  console.warn('[SESSION] WARNING: SESSION_SECRET not set. Sessions will not work until configured.');
}

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

// Auth routes
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

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
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

// Scheduler for daily predictions at 9:00 AM Eastern time
function startPredictionScheduler() {
  const port = process.env.PORT || 5000;
  
  const getETDateString = () => {
    const now = new Date();
    const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    return etTime.toISOString().split("T")[0];
  };
  
  const checkAndTriggerPredictions = async () => {
    const now = new Date();
    const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const hour = etTime.getHours();
    const minute = etTime.getMinutes();
    const day = etTime.getDay();
    
    // Check if it's a weekday (Mon-Fri)
    const isWeekday = day >= 1 && day <= 5;
    
    // 9:00 AM ET - Generate and save predictions (30 min before market open for best pre-market data)
    // UNIFIED SYSTEM: Uses Oracle's /daily endpoint which saves directly to predictions table
    if (isWeekday && hour === 9 && minute === 0) {
      log("Triggering daily prediction generation at 9:00 AM ET", "scheduler");
      try {
        // Use Oracle's unified daily endpoint with force refresh
        const response = await fetch(`http://localhost:${port}/api/oracle/daily?refresh=true`);
        if (response.ok) {
          const data = await response.json();
          const picks = data.data || [];
          log(`Daily predictions generated and saved - ${picks.length} picks`, "scheduler");
        } else {
          log("Failed to generate daily predictions", "scheduler");
        }
      } catch (error) {
        log(`Error generating predictions: ${error}`, "scheduler");
      }
    }
    
    // 9:35 AM ET - Update predictions with actual 9:30 AM open prices
    if (isWeekday && hour === 9 && minute === 35) {
      log("Updating predictions with actual 9:30 AM open prices", "scheduler");
      try {
        const response = await fetch(`http://localhost:${port}/api/oracle/update-open-prices`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (response.ok) {
          const data = await response.json();
          log(`Updated ${data.updates?.length || 0} predictions with actual open prices`, "scheduler");
        } else {
          log("Failed to update open prices", "scheduler");
        }
      } catch (error) {
        log(`Error updating open prices: ${error}`, "scheduler");
      }
    }
    
    // 8:00 AM ET - Generate crypto predictions daily (runs every day, crypto markets are 24/7)
    if (hour === 8 && minute === 0) {
      log("Triggering daily crypto prediction generation at 8:00 AM ET", "scheduler");
      try {
        const response = await fetch(`http://localhost:${port}/api/oracle/crypto-daily`);
        if (response.ok) {
          const data = await response.json();
          const picks = data.data || [];
          log(`Daily crypto predictions generated successfully - ${picks.length} picks`, "scheduler");
        } else {
          log("Failed to generate daily crypto predictions", "scheduler");
        }
      } catch (error) {
        log(`Error generating crypto predictions: ${error}`, "scheduler");
      }
    }

    // 4:15 PM ET - Finalize stock predictions with close prices
    // UNIFIED SYSTEM: Uses Oracle's finalization which updates the predictions table directly
    if (isWeekday && hour === 16 && minute === 15) {
      log("Finalizing daily predictions at 4:15 PM ET", "scheduler");
      try {
        // Call finalization service directly (updates predictions table)
        const result = await runStockFinalization();
        
        if (result.success) {
          log(`Finalized ${result.finalized} Oracle predictions with closing prices`, "scheduler");
        } else {
          log("Failed to finalize Oracle predictions", "scheduler");
        }
      } catch (error) {
        log(`Error finalizing predictions: ${error}`, "scheduler");
      }
    }

    // 11:59 PM ET - Finalize crypto predictions AND archive stock predictions for the day
    if (hour === 23 && minute === 59) {
      // Finalize crypto predictions
      log("Finalizing daily crypto predictions at 11:59 PM ET", "scheduler");
      try {
        const result = await runCryptoFinalization();
        if (result.success) {
          log(`Finalized ${result.finalized} crypto predictions`, "scheduler");
        } else {
          log("Failed to finalize crypto predictions", "scheduler");
        }
      } catch (error) {
        log(`Error finalizing crypto predictions: ${error}`, "scheduler");
      }
      
      // Archive/clear stock predictions for the day (mark as archived so they don't show in today's view)
      // This ensures a clean slate for the next trading day
      if (isWeekday) {
        log("Archiving stock predictions for end of day", "scheduler");
        try {
          const response = await fetch(`http://localhost:${port}/api/oracle/archive-today`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
          if (response.ok) {
            const data = await response.json();
            log(`Archived ${data.archived || 0} stock predictions for the day`, "scheduler");
          } else {
            log("Failed to archive stock predictions", "scheduler");
          }
        } catch (error) {
          log(`Error archiving stock predictions: ${error}`, "scheduler");
        }
      }
    }

    // 1:00 AM ET - Pre-compute backtest data for fast loading (runs daily)
    if (hour === 1 && minute === 0) {
      log("Starting daily backtest computation at 1:00 AM ET", "scheduler");
      try {
        const response = await fetch(`http://localhost:${port}/api/backtest/compute`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "all" }),
        });
        if (response.ok) {
          const data = await response.json();
          log(`Backtest computation completed: ${data.computed?.join(", ") || "none"}`, "scheduler");
        } else {
          log("Failed to compute backtests", "scheduler");
        }
      } catch (error) {
        log(`Error computing backtests: ${error}`, "scheduler");
      }
    }
  };
  
  // Check every minute
  setInterval(checkAndTriggerPredictions, 60 * 1000);
  log("Prediction scheduler started - stocks: 9:00 AM/4:15 PM/11:59 PM ET, crypto: 8:00 AM/11:59 PM ET", "scheduler");
}

(async () => {
  await initDb();
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
      // Start the prediction scheduler after server is running
      startPredictionScheduler();
    },
  );
})();

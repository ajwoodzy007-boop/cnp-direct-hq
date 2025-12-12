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

    stripeSync.syncBackfill()
      .then(() => console.log("Stripe data synced"))
      .catch((err: any) => console.error("Error syncing Stripe data:", err));
    
    stripeInitialized = true;
  } catch (error: any) {
    console.error("Failed to initialize Stripe:", error.message);
    console.log("Payments will be unavailable until Stripe is configured");
  }
}

// Run Stripe init in background - don't block server startup
setTimeout(() => initStripe().catch(console.error), 2000);

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

// Scheduler for daily predictions at 7:30 AM Eastern time
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
    
    // 7:30 AM ET - Generate and save predictions
    if (isWeekday && hour === 7 && minute === 30) {
      log("Triggering daily prediction generation at 7:30 AM ET", "scheduler");
      try {
        // Force regenerate predictions for the new day
        const response = await fetch(`http://localhost:${port}/api/market/top10-today?refresh=true`);
        if (response.ok) {
          const data = await response.json();
          const picks = data.data?.picks || [];
          log(`Daily predictions generated successfully - ${picks.length} picks`, "scheduler");
          
          // Save to historical database
          if (picks.length > 0) {
            const saveResponse = await fetch(`http://localhost:${port}/api/top10/save-run`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ date: getETDateString(), picks }),
            });
            if (saveResponse.ok) {
              log("Predictions saved to historical database", "scheduler");
            } else {
              log("Failed to save predictions to history", "scheduler");
            }
          }
        } else {
          log("Failed to generate daily predictions", "scheduler");
        }
      } catch (error) {
        log(`Error generating predictions: ${error}`, "scheduler");
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
    if (isWeekday && hour === 16 && minute === 15) {
      log("Finalizing daily predictions at 4:15 PM ET", "scheduler");
      try {
        // Call the Oracle finalization endpoint
        const finalizeResponse = await fetch(`http://localhost:${port}/api/oracle/finalize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        
        if (finalizeResponse.ok) {
          const result = await finalizeResponse.json();
          log(`Finalized ${result.finalized} Oracle predictions with closing prices`, "scheduler");
        } else {
          log("Failed to finalize Oracle predictions", "scheduler");
        }
        
        // Also finalize the top10 run if it exists
        const response = await fetch(`http://localhost:${port}/api/market/top10-today`);
        if (response.ok) {
          const data = await response.json();
          const picks = data.data?.picks || [];
          
          if (picks.length > 0) {
            const entries = picks.map((pick: any) => {
              const entryPrice = pick.openPrice || pick.price;
              const closePrice = pick.price;
              const closePnl = ((closePrice - entryPrice) / entryPrice) * 100;
              return {
                ticker: pick.ticker,
                closePrice,
                currentPrice: closePrice,
                closePnl: parseFloat(closePnl.toFixed(2)),
                totalPnl: parseFloat(closePnl.toFixed(2)),
                outcome: closePnl > 0 ? "win" : "loss",
              };
            });
            
            const top10Response = await fetch(`http://localhost:${port}/api/top10/finalize-run`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ date: getETDateString(), entries }),
            });
            if (top10Response.ok) {
              log(`Finalized ${entries.length} top10 predictions`, "scheduler");
            }
          }
        }
      } catch (error) {
        log(`Error finalizing predictions: ${error}`, "scheduler");
      }
    }

    // 11:59 PM ET - Finalize crypto predictions daily (runs every day)
    if (hour === 23 && minute === 59) {
      log("Finalizing daily crypto predictions at 11:59 PM ET", "scheduler");
      try {
        const finalizeResponse = await fetch(`http://localhost:${port}/api/oracle/crypto-finalize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        
        if (finalizeResponse.ok) {
          const result = await finalizeResponse.json();
          log(`Finalized ${result.finalized} crypto predictions`, "scheduler");
        } else {
          log("Failed to finalize crypto predictions", "scheduler");
        }
      } catch (error) {
        log(`Error finalizing crypto predictions: ${error}`, "scheduler");
      }
    }
  };
  
  // Check every minute
  setInterval(checkAndTriggerPredictions, 60 * 1000);
  log("Prediction scheduler started - stocks: 7:30 AM/4:15 PM ET, crypto: 8:00 AM/11:59 PM ET", "scheduler");
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

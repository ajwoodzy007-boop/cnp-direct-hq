import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./stripeClient";
import { WebhookHandlers } from "./webhookHandlers";

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
  const checkAndTriggerPredictions = async () => {
    const now = new Date();
    const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const hour = etTime.getHours();
    const minute = etTime.getMinutes();
    const day = etTime.getDay();
    
    // Check if it's 7:30 AM ET on a weekday (Mon-Fri)
    const isWeekday = day >= 1 && day <= 5;
    const isTargetTime = hour === 7 && minute === 30;
    
    if (isWeekday && isTargetTime) {
      log("Triggering daily prediction generation at 7:30 AM ET", "scheduler");
      try {
        // Force regenerate predictions for the new day
        const response = await fetch(`http://localhost:${process.env.PORT || 5000}/api/market/top10-today?refresh=true`);
        if (response.ok) {
          const data = await response.json();
          log(`Daily predictions generated successfully - ${data.data?.picks?.length || 0} picks`, "scheduler");
        } else {
          log("Failed to generate daily predictions", "scheduler");
        }
      } catch (error) {
        log(`Error generating predictions: ${error}`, "scheduler");
      }
    }
  };
  
  // Check every minute
  setInterval(checkAndTriggerPredictions, 60 * 1000);
  log("Prediction scheduler started - predictions will be generated at 7:30 AM ET", "scheduler");
}

(async () => {
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

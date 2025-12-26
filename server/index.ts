import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { WebhookHandlers } from "./webhookHandlers";
import authRouter from "./routes/auth";
import adminRouter from "./routes/admin";
import { systemHeartbeat } from "./routes/admin";
import { initDb } from "./db";
import { runStockFinalization } from "./lib/finalizationService";

const app = express();
const httpServer = createServer(app);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true,
    timeZone: "America/New_York"
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

// STRIPE WEBHOOK
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const signature = req.headers["stripe-signature"];
  if (!signature) return res.status(400).json({ error: "Missing signature" });
  try {
    const sig = Array.isArray(signature) ? signature[0] : signature;
    await WebhookHandlers.processWebhook(req.body as Buffer, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    res.status(200).json({ received: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.use(express.json({ verify: (req: any, _res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: false }));
app.set('trust proxy', 1);

app.use(session({
  secret: process.env.SESSION_SECRET || 'sentinel-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: true, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }
}));

app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);

/**
 * TURNKEY AUTOMATION SCHEDULER
 * Triggers 09:00 AM Generation and 16:30 PM Finalization (ET).
 */
function startPredictionScheduler() {
  const port = process.env.PORT || 5000;
  
  setInterval(async () => {
    const now = new Date();
    const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const hour = etTime.getHours();
    const minute = etTime.getMinutes();
    const isWeekday = etTime.getDay() >= 1 && etTime.getDay() <= 5;

    // 09:00 AM ET - GENERATE
    if (isWeekday && hour === 9 && minute === 0) {
      try {
        await fetch(`http://localhost:${port}/api/oracle/daily?refresh=true`);
        systemHeartbeat.lastGeneration = etTime.toLocaleTimeString();
        log("Automated 9:00 AM Generation Successful", "scheduler");
      } catch (e) { log(`Generation Error: ${e}`, "scheduler"); }
    }
    
    // 16:30 PM ET - FINALIZE
    if (isWeekday && hour === 16 && minute === 30) {
      try {
        await runStockFinalization();
        systemHeartbeat.lastFinalization = etTime.toLocaleTimeString();
        log("Automated 4:30 PM Finalization Successful", "scheduler");
      } catch (e) { log(`Finalization Error: ${e}`, "scheduler"); }
    }
  }, 60000); // Check every minute
  
  log("Scheduler Active: Monitoring 09:00/16:30 ET", "scheduler");
}

(async () => {
  await initDb();
  await registerRoutes(httpServer, app);
  
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen({ port, host: "0.0.0.0" }, () => {
    log(`Serving on port ${port}`);
    setTimeout(() => startPredictionScheduler(), 5000);
  });
})();

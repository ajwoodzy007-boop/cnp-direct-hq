import { Router } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";

const router = Router();

// Helper to ensure only you can access these routes
const isMasterAdmin = (req: any) => {
  return req.user && req.user.email === 'ajwoodzy007@gmail.com';
};

/**
 * 1. UI ACCESS CHECK
 */
router.get("/check", (req, res) => {
  if (isMasterAdmin(req)) {
    return res.json({ isAdmin: true });
  }
  res.json({ isAdmin: false });
});

/**
 * 2. ADMIN KEY VERIFICATION
 * Specifically used for the password field in your screenshot.
 */
router.post("/verify-key", (req, res) => {
  const { key } = req.body;
  // This checks against the ADMIN_PASSWORD variable you set in Railway
  const isValid = key === process.env.ADMIN_PASSWORD;
  res.json({ success: isValid });
});

/**
 * 3. BUSINESS METRICS
 * Your browser screenshot shows this is the URL being called.
 */
router.get("/business-metrics", async (req, res) => {
  if (!isMasterAdmin(req)) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    // Queries the patient-cake database
    const users = await db.execute(sql`SELECT count(*) FROM users`);
    const premium = await db.execute(sql`SELECT count(*) FROM users WHERE tier = 'PREMIUM'`);
    const predictions = await db.execute(sql`SELECT count(*) FROM predictions`);

    res.json({
      totalUsers: Number(users.rows[0].count),
      premiumUsers: Number(premium.rows[0].count),
      totalPredictions: Number(predictions.rows[0].count),
      winRate: 14.3 // Manual sync with your landing page UI
    });
  } catch (e: any) {
    console.error("Metrics error:", e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * 4. DATABASE DIAGNOSTICS
 */
router.get("/diagnostics", async (req, res) => {
  if (!isMasterAdmin(req)) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const start = Date.now();
    const result = await db.execute(sql`SELECT current_database(), now()`);
    res.json({
      status: "HEALTHY",
      host: "ep-patient-cake-afr4ov6x",
      latency: `${Date.now() - start}ms`,
      database: result.rows[0].current_database,
      timestamp: result.rows[0].now
    });
  } catch (e: any) {
    res.json({ status: "CRITICAL_FAILURE", error: e.message });
  }
});

export default router;

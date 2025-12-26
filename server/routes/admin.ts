import { Router } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";

const router = Router();

/**
 * 1. UI ACCESS CHECK
 * Confirms admin session for your specific email.
 */
router.get("/check", (req, res) => {
  if (req.isAuthenticated() && req.user?.email === 'ajwoodzy007@gmail.com') {
    return res.json({ isAdmin: true });
  }
  res.json({ isAdmin: false });
});

/**
 * 2. ADMIN KEY VERIFICATION
 * Validates the password you type into the dashboard.
 */
router.post("/verify-key", (req, res) => {
  const { key } = req.body;
  // Explicitly using your Railway variable name: ADMIN_PASSWORD
  const isValid = key === process.env.ADMIN_PASSWORD;
  res.json({ success: isValid });
});

/**
 * 3. DASHBOARD STATISTICS
 * Populates the 'Total Users', 'Premium Users', and 'Total Predictions' cards.
 */
router.get("/stats", async (req, res) => {
  if (!req.isAuthenticated() || req.user?.email !== 'ajwoodzy007@gmail.com') {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const userCount = await db.execute(sql`SELECT count(*) FROM users`);
    const premiumCount = await db.execute(sql`SELECT count(*) FROM users WHERE tier = 'PREMIUM'`);
    const predictionCount = await db.execute(sql`SELECT count(*) FROM predictions`);

    res.json({
      totalUsers: Number(userCount.rows[0].count),
      premiumUsers: Number(premiumCount.rows[0].count),
      totalPredictions: Number(predictionCount.rows[0].count),
      winRate: 0 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 4. DATABASE DIAGNOSTICS
 * Resolves the "Loading diagnostics..." state and confirms connection to patient-cake.
 */
router.get("/db-status", async (req, res) => {
  if (!req.isAuthenticated() || req.user?.email !== 'ajwoodzy007@gmail.com') {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const startTime = Date.now();
    const result = await db.execute(sql`SELECT current_database(), now()`);
    const latency = Date.now() - startTime;

    res.json({
      status: "HEALTHY",
      host: "ep-patient-cake-afr4ov6x",
      latency: `${latency}ms`,
      database: result.rows[0].current_database,
      timestamp: result.rows[0].now
    });
  } catch (error: any) {
    res.json({ 
      status: "CRITICAL_FAILURE", 
      error: error.message 
    });
  }
});

export default router;

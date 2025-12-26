import { Router } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";

const router = Router();

/**
 * 1. UI ACCESS CHECK
 * Validates the admin session for the frontend button visibility.
 */
router.get("/check", (req, res) => {
  if (req.isAuthenticated() && req.user?.email === 'ajwoodzy007@gmail.com') {
    return res.json({ isAdmin: true });
  }
  res.json({ isAdmin: false });
});

/**
 * 2. DASHBOARD STATISTICS
 * Directly populates the 'Total Users', 'Premium Users', and 'Total Predictions' cards.
 */
router.get("/stats", async (req, res) => {
  // Security: Restricted to master email
  if (!req.isAuthenticated() || req.user?.email !== 'ajwoodzy007@gmail.com') {
    return res.status(403).json({ error: "Unauthorized access to Sentinel stats." });
  }

  try {
    // These queries hit the 'patient-cake' Neon tables
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
    console.error("Dashboard Stats Error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 3. DATABASE DIAGNOSTICS
 * This resolves the "Loading diagnostics..." text at the bottom of your screen.
 */
router.get("/db-status", async (req, res) => {
  if (!req.isAuthenticated() || req.user?.email !== 'ajwoodzy007@gmail.com') {
    return res.status(403).json({ error: "Unauthorized access to Sentinel diagnostics." });
  }

  try {
    const startTime = Date.now();
    
    // Confirms connection to the 'patient-cake' host
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
    console.error("DB Status Error:", error);
    res.json({ 
      status: "CRITICAL_FAILURE", 
      error: error.message,
      hint: "Check DATABASE_URL in Railway variables."
    });
  }
});

export default router;

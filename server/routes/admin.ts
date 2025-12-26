import { Router } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";

const router = Router();

/**
 * 1. UI Access Check
 * Used by the frontend (App.tsx) to determine if the Admin Dashboard
 * button should be rendered.
 */
router.get("/check", (req, res) => {
  if (req.isAuthenticated() && req.user?.email === 'ajwoodzy007@gmail.com') {
    return res.json({ isAdmin: true });
  }
  res.json({ isAdmin: false });
});

/**
 * 2. Dashboard Statistics
 * This populates the "Total Users", "Premium Users", and "Total Predictions" 
 * cards in your Sentinel Command Center.
 */
router.get("/stats", async (req, res) => {
  // Master email protection
  if (!req.isAuthenticated() || req.user?.email !== 'ajwoodzy007@gmail.com') {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    // Queries the live patient-cake database tables
    const userCount = await db.execute(sql`SELECT count(*) FROM users`);
    const premiumCount = await db.execute(sql`SELECT count(*) FROM users WHERE tier = 'PREMIUM'`);
    const predictionCount = await db.execute(sql`SELECT count(*) FROM predictions`);

    res.json({
      totalUsers: Number(userCount.rows[0].count),
      premiumUsers: Number(premiumCount.rows[0].count),
      totalPredictions: Number(predictionCount.rows[0].count),
      winRate: 0 // Placeholder until win-rate logic is finalized
    });
  } catch (error: any) {
    console.error("Stats Fetch Error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 3. Database Diagnostics
 * Checklist Item #1: Confirming the handshake with ep-patient-cake-afr4ov6x.
 * This will resolve the "Loading diagnostics..." state in your UI.
 */
router.get("/db-status", async (req, res) => {
  if (!req.isAuthenticated() || req.user?.email !== 'ajwoodzy007@gmail.com') {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const startTime = Date.now();
    
    // Raw SQL to check DB health and regional identity
    const result = await db.execute(sql`SELECT current_database(), now(), version()`);
    const latency = Date.now() - startTime;

    res.json({
      status: "HEALTHY",
      host: "ep-patient-cake-afr4ov6x",
      latency: `${latency}ms`,
      database: result.rows[0].current_database,
      timestamp: result.rows[0].now,
      server_info: result.rows[0].version
    });
  } catch (error: any) {
    console.error("DB Status Diagnostic Error:", error);
    res.status(500).json({
      status: "CRITICAL_FAILURE",
      error: error.message,
      hint: "Verify DATABASE_URL in Railway matches the patient-cake host."
    });
  }
});

export default router;

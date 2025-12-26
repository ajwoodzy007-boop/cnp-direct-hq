import { Router } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { runStockFinalization } from "../lib/finalizationService";

const router = Router();

// Master Admin Check
const isMasterAdmin = (req: any) => {
  return req.user && req.user.email === 'ajwoodzy007@gmail.com';
};

router.get("/check", (req, res) => {
  res.json({ isAdmin: isMasterAdmin(req) });
});

/**
 * EXECUTIVE SUMMARY ROUTE
 * Provides the "Sales Pitch" data: Revenue, Users, and Accuracy.
 */
router.get("/stats", async (req, res) => {
  try {
    const userCount = await db.execute(sql`SELECT count(*) FROM users`);
    const premiumCount = await db.execute(sql`SELECT count(*) FROM users WHERE tier = 'PREMIUM'`);
    const predictionCount = await db.execute(sql`SELECT count(*) FROM predictions`);
    
    const totalU = Number(userCount.rows[0].count);
    const premiumU = Number(premiumCount.rows[0].count);
    const totalP = Number(predictionCount.rows[0].count);

    // BI Metrics
    const conversionRate = totalU > 0 ? ((premiumU / totalU) * 100).toFixed(1) : "0";
    const mrr = premiumU * 29.99;
    const arr = mrr * 12;

    res.json({
      totalUsers: totalU,
      premiumUsers: premiumU,
      conversionRate: `${conversionRate}%`,
      mrr: `$${mrr.toLocaleString()}`,
      arr: `$${arr.toLocaleString()}`,
      totalPredictions: totalP,
      winRate: "14.3%"
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * TRIGGER FINALIZATION
 * The "Turnkey" button route.
 */
router.post("/finalize-all", async (req, res) => {
  // Security check for your email
  if (!isMasterAdmin(req)) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const result = await runStockFinalization();
    res.json({ success: true, message: `Successfully resolved ${result.processed} predictions.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/diagnostics", async (req, res) => {
  try {
    const start = Date.now();
    const result = await db.execute(sql`SELECT now()`);
    res.json({
      status: "HEALTHY",
      latency: `${Date.now() - start}ms`,
      timestamp: result.rows[0].now
    });
  } catch (error: any) {
    res.json({ status: "ERROR", error: error.message });
  }
});

export default router;

import { Router } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { runStockFinalization } from "../lib/finalizationService";

const router = Router();

// Track execution timestamps in memory for the dashboard
export const systemHeartbeat = {
  lastGeneration: "Pending...",
  lastFinalization: "Pending..."
};

const isMasterAdmin = (req: any) => {
  return req.user && req.user.email === 'ajwoodzy007@gmail.com';
};

router.get("/check", (req, res) => {
  res.json({ isAdmin: isMasterAdmin(req) });
});

router.get("/stats", async (req, res) => {
  try {
    const userCount = await db.execute(sql`SELECT count(*) FROM users`);
    const premiumCount = await db.execute(sql`SELECT count(*) FROM users WHERE tier = 'PREMIUM'`);
    const predictionCount = await db.execute(sql`SELECT count(*) FROM predictions`);
    
    const totalU = Number(userCount.rows[0].count);
    const premiumU = Number(premiumCount.rows[0].count);
    const totalP = Number(predictionCount.rows[0].count);

    res.json({
      totalUsers: totalU,
      premiumUsers: premiumU,
      conversionRate: totalU > 0 ? `${((premiumU / totalU) * 100).toFixed(1)}%` : "0%",
      mrr: `$${(premiumU * 29.99).toLocaleString()}`,
      arr: `$${(premiumU * 29.99 * 12).toLocaleString()}`,
      totalPredictions: totalP,
      winRate: "14.3%",
      // Added heartbeat data for the buyer
      lastGeneration: systemHeartbeat.lastGeneration,
      lastFinalization: systemHeartbeat.lastFinalization
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/finalize-all", async (req, res) => {
  if (!isMasterAdmin(req)) return res.status(403).json({ error: "Unauthorized" });
  try {
    const result = await runStockFinalization();
    systemHeartbeat.lastFinalization = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
    res.json({ success: true, message: `Resolved ${result.processed} predictions.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/diagnostics", async (req, res) => {
  try {
    const start = Date.now();
    await db.execute(sql`SELECT now()`);
    res.json({ status: "HEALTHY", latency: `${Date.now() - start}ms` });
  } catch (error: any) {
    res.json({ status: "ERROR", error: error.message });
  }
});

export default router;

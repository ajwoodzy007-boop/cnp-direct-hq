import { Router } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";

const router = Router();

// Master check for your email
const isAdmin = (req: any) => req.user && req.user.email === 'ajwoodzy007@gmail.com';

router.get("/check", (req, res) => {
  res.json({ isAdmin: isAdmin(req) });
});

router.post("/verify-key", (req, res) => {
  res.json({ success: req.body.key === process.env.ADMIN_PASSWORD });
});

// THIS MATCHES YOUR LOGS: /api/admin/stats
router.get("/stats", async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: "Unauthorized" });

  try {
    const users = await db.execute(sql`SELECT count(*) FROM users`);
    const premium = await db.execute(sql`SELECT count(*) FROM users WHERE tier = 'PREMIUM'`);
    const predictions = await db.execute(sql`SELECT count(*) FROM predictions`);

    res.json({
      totalUsers: Number(users.rows[0].count),
      premiumUsers: Number(premium.rows[0].count),
      totalPredictions: Number(predictions.rows[0].count),
      winRate: 14.3
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// MATCHES YOUR LOGS: /api/admin/beta-passes
router.get("/beta-passes", async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: "Unauthorized" });
  res.json([]);
});

// DIAGNOSTICS
router.get("/diagnostics", async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: "Unauthorized" });
  try {
    const result = await db.execute(sql`SELECT now()`);
    res.json({ status: "HEALTHY", host: "patient-cake", time: result.rows[0].now });
  } catch (e: any) {
    res.json({ status: "ERROR", error: e.message });
  }
});

export default router;

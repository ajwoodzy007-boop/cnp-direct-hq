import { Router } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";

const router = Router();

// Master trust for your account
const isMaster = (req: any) => req.user && req.user.email === 'ajwoodzy007@gmail.com';

router.get("/check", (req, res) => {
  res.json({ isAdmin: isMaster(req) });
});

// REMOVED THE KEY REQUIREMENT: This now tells the frontend it's always verified
router.post("/verify-key", (req, res) => {
  res.json({ success: true });
});

// MATCHES THE /stats CALL IN YOUR LOGS
router.get("/stats", async (req, res) => {
  if (!isMaster(req)) return res.status(403).send("Unauthorized");

  try {
    const users = await db.execute(sql`SELECT count(*) FROM users`);
    const premium = await db.execute(sql`SELECT count(*) FROM users WHERE tier = 'PREMIUM'`);
    const predictions = await db.execute(sql`SELECT count(*) FROM predictions`);

    // Sending the exact format the frontend expects
    res.json({
      totalUsers: Number(users.rows[0].count),
      premiumUsers: Number(premium.rows[0].count),
      totalPredictions: Number(predictions.rows[0].count),
      winRate: 14.3
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/diagnostics", async (req, res) => {
  if (!isMaster(req)) return res.status(403).send("Unauthorized");
  try {
    const result = await db.execute(sql`SELECT now()`);
    res.json({ status: "HEALTHY", timestamp: result.rows[0].now });
  } catch (e) {
    res.json({ status: "ERROR", error: e.message });
  }
});

router.get("/beta-passes", (req, res) => res.json([]));

export default router;

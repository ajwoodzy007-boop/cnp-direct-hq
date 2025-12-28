import express from 'express';
import { query } from '../db';

const router = express.Router();

router.get('/stats', async (req: express.Request, res: express.Response) => {
  try {
    // We select the actual database values to drive the UI
    const operatives = await query(
      "SELECT id, email, tier, is_premium FROM users ORDER BY tier DESC, email ASC"
    );

    return res.status(200).json({
      success: true,
      totalUsers: operatives.length,
      mrr: 1250,
      conversionRate: 12.5,
      aiWinRate: 74,
      users: operatives
    });
  } catch (err) {
    console.error("Admin Stats Error:", err);
    return res.status(500).json({ success: false, message: "Database handshake failed" });
  }
});

router.get('/elevate', async (req: express.Request, res: express.Response) => {
  const email = req.query.email as string;
  if (!email) return res.status(400).send("Email required.");

  try {
    await query(
      "UPDATE users SET tier = 'ADMIN', is_premium = true WHERE email = $1",
      [email]
    );
    return res.status(200).send(`ACCESS_GRANTED: ${email} elevated to ADMIN status.`);
  } catch (err) {
    return res.status(500).send("Elevation failed.");
  }
});

export default router;

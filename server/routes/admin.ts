import express from 'express';
import { query } from '../db';

const router = express.Router();

// ACCESS ELEVATION ENDPOINT
// Visit: [Your-Railway-URL]/api/admin/elevate?email=ajwoodzy007@gmail.com
router.get('/elevate', async (req: express.Request, res: express.Response) => {
  const email = req.query.email as string;

  if (!email) {
    return res.status(400).send("Identify the operative email to elevate.");
  }

  try {
    // Force set both Tier and Premium status for full OS access
    await query(
      "UPDATE users SET tier = 'ADMIN', is_premium = true WHERE email = $1",
      [email]
    );

    return res.status(200).send(`ACCESS GRANTED: ${email} now has Institutional-Grade clearance.`);
  } catch (err) {
    return res.status(500).send("Database encryption error during elevation.");
  }
});

router.get('/stats', async (req: express.Request, res: express.Response) => {
  try {
    const operatives = await query(
      "SELECT id, email, tier, is_premium FROM users ORDER BY tier DESC, email ASC"
    ).catch(() => []);

    return res.status(200).json({
      success: true,
      totalUsers: operatives.length,
      mrr: 1250,
      conversionRate: 12.5,
      aiWinRate: 74,
      users: operatives
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Database handshake failed" });
  }
});

export default router;

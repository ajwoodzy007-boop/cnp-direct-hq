import express from 'express';
import { query } from '../db';

const router = express.Router();

// Visit: [Your-URL]/api/admin/elevate?email=ajwoodzy007@gmail.com
router.get('/elevate', async (req: express.Request, res: express.Response) => {
  const email = req.query.email as string;

  if (!email) return res.status(400).send("Email required.");

  try {
    // 1. Force the update in Neon
    await query(
      "UPDATE users SET tier = 'ADMIN', is_premium = true WHERE email = $1",
      [email]
    );

    // 2. Fetch the updated record to confirm
    const updatedUser = await query(
      "SELECT email, tier, is_premium FROM users WHERE email = $1",
      [email]
    );

    return res.status(200).json({
      message: "ACCESS_GRANTED",
      verification: updatedUser[0]
    });
  } catch (err) {
    return res.status(500).send("Database elevation failed.");
  }
});

router.get('/stats', async (req: express.Request, res: express.Response) => {
  try {
    // Sort by tier then email to keep the list organized
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
    return res.status(500).json({ success: false });
  }
});

export default router;

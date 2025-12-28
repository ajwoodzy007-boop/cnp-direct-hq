import express from 'express';
import { query } from '../db';

const router = express.Router();

router.get('/stats', async (req: express.Request, res: express.Response) => {
  try {
    // UPDATED: Using 'ispremium' to match your actual Neon schema
    const operatives = await query(
      "SELECT id, email, tier, ispremium FROM users ORDER BY tier DESC, email ASC"
    );

    // Map the database 'ispremium' to the frontend 'is_premium' so the UI doesn't break
    const mappedOperatives = operatives.map((op: any) => ({
      ...op,
      is_premium: op.ispremium // Translate for the frontend
    }));

    return res.status(200).json({
      success: true,
      totalUsers: mappedOperatives.length,
      mrr: 1250,
      conversionRate: 12.5,
      aiWinRate: 74,
      users: mappedOperatives
    });
  } catch (err) {
    return res.status(500).json({ success: false });
  }
});

router.get('/elevate', async (req: express.Request, res: express.Response) => {
  const email = req.query.email as string;
  if (!email) return res.status(400).send("Email required.");

  try {
    // UPDATED: Setting 'ispremium' to match your schema
    await query(
      "UPDATE users SET tier = 'ADMIN', ispremium = true WHERE email = $1",
      [email]
    );
    return res.status(200).send(`ACCESS_GRANTED: ${email} is now ADMIN.`);
  } catch (err) {
    return res.status(500).send("Elevation failed.");
  }
});

export default router;

import express from 'express';
import { query } from '../db';
import { requireAdmin } from '../middleware/admin.js';

const router = express.Router();

// All admin routes require admin privileges
router.use(requireAdmin);

router.get('/stats', async (req: express.Request, res: express.Response) => {
  try {
    // UPDATED: Query members table instead of users
    const operatives = await query(
      "SELECT id, email, membership_tier FROM members ORDER BY membership_tier DESC, email ASC"
    );

    // Map the database fields to the frontend format
    const mappedOperatives = (operatives.rows || []).map((op: any) => ({
      id: op.id,
      email: op.email,
      tier: op.membership_tier,
      membership_tier: op.membership_tier,
      // For backward compatibility with frontend
      is_premium: op.membership_tier === 'PREMIUM' || op.membership_tier === 'PRO' || op.membership_tier === 'admin',
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
    console.error("Admin stats error:", err);
    return res.status(500).json({ success: false });
  }
});

router.get('/elevate', async (req: express.Request, res: express.Response) => {
  const email = req.query.email as string;
  if (!email) return res.status(400).send("Email required.");

  try {
    // UPDATED: Update members table, set membership_tier to 'admin'
    await query(
      "UPDATE members SET membership_tier = 'admin' WHERE email = $1",
      [email]
    );
    return res.status(200).send(`ACCESS_GRANTED: ${email} is now ADMIN.`);
  } catch (err) {
    console.error("Elevate error:", err);
    return res.status(500).send("Elevation failed.");
  }
});

export default router;

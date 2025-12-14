import { Router } from 'express';
import { db, query } from '../db';
// FIX: Import tables directly from the schema file
import { users, predictions } from '@shared/schema';
import { eq, sql, desc } from 'drizzle-orm';

const router = Router();

// --- SECURITY FIX: READ FROM ENVIRONMENT VARIABLES ---
const ADMIN_EMAILS = (process.env.ADMIN_EMAIL || '').split(',').map(e => e.trim());

// Middleware to check for Admin
const requireAdmin = (req: any, res: any, next: any) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // If env var is missing, no one gets in (Safe)
  if (!ADMIN_EMAILS.includes(req.session.user.email)) {
    console.log(`[Admin Attempt Blocked] User: ${req.session.user.email}`);
    return res.status(403).json({ error: "Access Denied: Admin Clearance Required" });
  }

  next();
};

router.use(requireAdmin);

// ==========================================
// 1. SYSTEM CHECKS
// ==========================================

router.get('/check', (req, res) => {
  res.json({ success: true, message: "Welcome, Operator." });
});

router.get('/diagnostics', async (req, res) => {
  try {
    const userCount = await db.select({ count: sql`count(*)` }).from(users);
    const predCount = await db.select({ count: sql`count(*)` }).from(predictions);

    // Get distinct statuses
    const statuses = await db.execute(sql`
      SELECT status, COUNT(*) as count 
      FROM predictions 
      GROUP BY status
    `);

    res.json({
      success: true,
      data: {
        users: userCount[0].count,
        predictions: predCount[0].count,
        breakdown: statuses.rows
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await db.select({ count: sql`count(*)` }).from(users);

    const premiumUsers = await db.execute(sql`
      SELECT count(*) as count FROM users WHERE tier = 'PREMIUM'
    `);

    const mrr = Number(premiumUsers.rows[0].count) * 29;

    res.json({
      success: true,
      stats: {
        total: totalUsers[0].count,
        premium: premiumUsers.rows[0].count,
        mrr: mrr
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 2. USER MANAGEMENT
// ==========================================

router.get('/users', async (req, res) => {
  try {
    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      tier: users.tier,
    }).from(users);

    res.json({ success: true, users: allUsers });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/users/:id/tier', async (req, res) => {
  const { id } = req.params;
  const { tier } = req.body;

  if (!['FREE', 'PREMIUM'].includes(tier)) {
    return res.status(400).json({ error: "Invalid tier" });
  }

  try {
    // Note: Since ID is a varchar/uuid in your schema, we don't parse it as Int
    await db.update(users)
      .set({ tier: tier })
      .where(eq(users.id, id));

    res.json({ success: true, message: `User ${id} updated to ${tier}` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 3. BETA PASS MANAGEMENT
// ==========================================

router.get('/beta-passes', async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM beta_passes ORDER BY created_at DESC`);
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.json({ success: true, data: [] });
  }
});

router.post('/beta-passes/generate', async (req, res) => {
  const { note, tier } = req.body;
  const code = `SENTINEL-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  try {
    // Basic insert via SQL to avoid complex schema imports for now
    await db.execute(sql`
      INSERT INTO beta_passes (code, created_by_admin, expires_at)
      VALUES (${code}, 'Admin', NOW() + INTERVAL '7 days')
    `);

    res.json({ success: true, code, message: "Pass generated" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/beta-passes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.execute(sql`DELETE FROM beta_passes WHERE id = ${id}`);
    res.json({ success: true, message: "Pass revoked" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
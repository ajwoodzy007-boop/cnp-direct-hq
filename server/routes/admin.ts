import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../db';

const router = Router();

const ADMIN_EMAIL = 'ajwoodzy007@gmail.com';

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req.session as any).user;
  
  if (!user) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }
  
  if (user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return res.status(403).json({ success: false, error: "Admin access required" });
  }
  
  next();
}

router.get('/check', (req, res) => {
  const user = (req.session as any).user;
  const isAdmin = user && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  res.json({ isAdmin });
});

router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const usersResult = await query('SELECT COUNT(*) as total, tier FROM users GROUP BY tier');
    const predictionsResult = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN outcome = 'WIN' THEN 1 END) as wins,
        COUNT(CASE WHEN outcome = 'LOSS' THEN 1 END) as losses
      FROM daily_prediction_entries
    `);
    
    const recentUsersResult = await query(`
      SELECT id, email, tier 
      FROM users 
      LIMIT 10
    `);
    
    const dailyRunsResult = await query(`
      SELECT id, run_date, created_at 
      FROM daily_prediction_runs 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    const tierCounts: Record<string, number> = {};
    let totalUsers = 0;
    for (const row of usersResult.rows) {
      tierCounts[row.tier] = parseInt(row.total);
      totalUsers += parseInt(row.total);
    }

    const predStats = predictionsResult.rows[0] || { total: 0, wins: 0, losses: 0 };
    const winRate = predStats.total > 0 
      ? ((parseInt(predStats.wins) / (parseInt(predStats.wins) + parseInt(predStats.losses))) * 100).toFixed(1)
      : '0';

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          byTier: tierCounts
        },
        predictions: {
          total: parseInt(predStats.total),
          wins: parseInt(predStats.wins),
          losses: parseInt(predStats.losses),
          winRate
        },
        recentUsers: recentUsersResult.rows,
        recentRuns: dailyRunsResult.rows
      }
    });
  } catch (e) {
    console.error('Admin stats error:', e);
    res.status(500).json({ success: false, error: "Failed to fetch stats" });
  }
});

router.get('/users', requireAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT id, email, tier 
      FROM users
    `);
    res.json({ success: true, users: result.rows });
  } catch (e) {
    console.error('Admin users error:', e);
    res.status(500).json({ success: false, error: "Failed to fetch users" });
  }
});

router.post('/users/:id/tier', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { tier } = req.body;
  
  if (!['FREE', 'PREMIUM'].includes(tier)) {
    return res.status(400).json({ success: false, error: "Invalid tier" });
  }
  
  try {
    await query('UPDATE users SET tier = $1 WHERE id = $2', [tier, id]);
    res.json({ success: true });
  } catch (e) {
    console.error('Admin tier update error:', e);
    res.status(500).json({ success: false, error: "Failed to update tier" });
  }
});

function generatePassCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'BETA-';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

router.get('/beta-passes', requireAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT bp.*, u.email as redeemed_email
      FROM beta_passes bp
      LEFT JOIN users u ON bp.redeemed_by = u.id
      ORDER BY bp.created_at DESC
    `);
    res.json({ success: true, passes: result.rows });
  } catch (e) {
    console.error('Beta passes error:', e);
    res.status(500).json({ success: false, error: "Failed to fetch beta passes" });
  }
});

router.post('/beta-passes/generate', requireAdmin, async (req, res) => {
  try {
    const code = generatePassCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    const result = await query(
      `INSERT INTO beta_passes (code, expires_at, created_by_admin) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [code, expiresAt, ADMIN_EMAIL]
    );
    
    res.json({ success: true, pass: result.rows[0] });
  } catch (e) {
    console.error('Generate beta pass error:', e);
    res.status(500).json({ success: false, error: "Failed to generate pass" });
  }
});

router.delete('/beta-passes/:id', requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM beta_passes WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    console.error('Delete beta pass error:', e);
    res.status(500).json({ success: false, error: "Failed to delete pass" });
  }
});

export default router;

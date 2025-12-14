import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../db';
import { runStockFinalization, runCryptoFinalization, runAllPendingFinalization } from '../lib/finalizationService';

const router = Router();

// Admin emails from environment variable (comma-separated for multiple admins)
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(e => e);

function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req.session as any).user;
  
  if (!user) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }
  
  if (!user.email || !isAdminEmail(user.email)) {
    return res.status(403).json({ success: false, error: "Admin access required" });
  }
  
  next();
}

router.get('/check', (req, res) => {
  const user = (req.session as any).user;
  const isAdmin = user && user.email && isAdminEmail(user.email);
  res.json({ isAdmin });
});

// Diagnostic endpoint to check database state
router.get('/diagnostics', requireAdmin, async (req, res) => {
  try {
    const diagnostics: Record<string, any> = {};
    
    // Check users table
    try {
      const usersCount = await query('SELECT COUNT(*) as count FROM users');
      diagnostics.users = { count: parseInt(usersCount.rows[0]?.count || '0'), error: null };
    } catch (e: any) {
      diagnostics.users = { count: 0, error: e.message };
    }
    
    // Check predictions table
    try {
      const predCount = await query('SELECT COUNT(*) as count FROM predictions');
      diagnostics.predictions = { count: parseInt(predCount.rows[0]?.count || '0'), error: null };
    } catch (e: any) {
      diagnostics.predictions = { count: 0, error: e.message };
    }
    
    // Check beta_passes table
    try {
      const betaCount = await query('SELECT COUNT(*) as count FROM beta_passes');
      diagnostics.beta_passes = { count: parseInt(betaCount.rows[0]?.count || '0'), error: null };
    } catch (e: any) {
      diagnostics.beta_passes = { count: 0, error: e.message };
    }
    
    // List all tables in database
    try {
      const tables = await query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' ORDER BY table_name
      `);
      diagnostics.tables = tables.rows.map((r: any) => r.table_name);
    } catch (e: any) {
      diagnostics.tables = { error: e.message };
    }
    
    res.json({ success: true, diagnostics });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/stats', requireAdmin, async (req, res) => {
  try {
    // Get total user count first
    const totalUsersResult = await query('SELECT COUNT(*) as total FROM users');
    const totalUsers = parseInt(totalUsersResult.rows[0]?.total || '0');
    
    // Get premium count separately
    let premiumCount = 0;
    try {
      const premiumResult = await query("SELECT COUNT(*) as count FROM users WHERE tier = 'PREMIUM'");
      premiumCount = parseInt(premiumResult.rows[0]?.count || '0');
    } catch (e) {
      console.error('Premium count failed:', e);
    }
    
    // Query all predictions for total count
    const allPredictionsResult = await query('SELECT COUNT(*) as total FROM predictions');
    const totalPredictions = parseInt(allPredictionsResult.rows[0]?.total || '0');
    
    // Query finalized predictions for win/loss
    let wins = 0, losses = 0;
    try {
      const finalizedResult = await query(`
        SELECT 
          COUNT(CASE WHEN LOWER(outcome) = 'win' THEN 1 END) as wins,
          COUNT(CASE WHEN LOWER(outcome) = 'loss' THEN 1 END) as losses
        FROM predictions
        WHERE outcome IS NOT NULL AND outcome != '' AND LOWER(outcome) != 'pending'
      `);
      wins = parseInt(finalizedResult.rows[0]?.wins || '0');
      losses = parseInt(finalizedResult.rows[0]?.losses || '0');
    } catch (e) {
      console.error('Finalized predictions query failed:', e);
    }
    
    // Get recent users - handle missing columns gracefully
    let recentUsersResult: { rows: any[] } = { rows: [] };
    try {
      recentUsersResult = await query(`SELECT id, email, COALESCE(tier, 'FREE') as tier FROM users LIMIT 10`);
    } catch (e) {
      console.error('Recent users query failed:', e);
      try {
        recentUsersResult = await query(`SELECT id, email, 'FREE' as tier FROM users LIMIT 10`);
      } catch (e2) {
        console.error('Fallback users query failed:', e2);
      }
    }
    
    // Get daily runs
    let dailyRunsResult: { rows: any[] } = { rows: [] };
    try {
      dailyRunsResult = await query(`
        SELECT id, run_date, created_at 
        FROM daily_prediction_runs 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
    } catch (e) {
      console.error('Daily runs query failed:', e);
    }

    const winRate = (wins + losses) > 0 
      ? ((wins / (wins + losses)) * 100).toFixed(1)
      : '0';

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          byTier: { PREMIUM: premiumCount, FREE: totalUsers - premiumCount }
        },
        predictions: {
          total: totalPredictions,
          wins: wins,
          losses: losses,
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
    const user = (req.session as any).user;
    const code = generatePassCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    const result = await query(
      `INSERT INTO beta_passes (code, expires_at, created_by_admin) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [code, expiresAt, user.email]
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

// Force finalize today's predictions (admin only)
router.post('/force-finalize', requireAdmin, async (req, res) => {
  try {
    console.log('[ADMIN] Force finalize stocks triggered');
    const result = await runStockFinalization();
    console.log('[ADMIN] Force finalize result:', result);
    res.json(result);
  } catch (e: any) {
    console.error('Force finalize error:', e);
    res.status(500).json({ success: false, error: e.message || "Failed to force finalize" });
  }
});

// Force finalize crypto predictions (admin only)
router.post('/force-finalize-crypto', requireAdmin, async (req, res) => {
  try {
    console.log('[ADMIN] Force finalize crypto triggered');
    const result = await runCryptoFinalization();
    console.log('[ADMIN] Force crypto finalize result:', result);
    res.json(result);
  } catch (e: any) {
    console.error('Force crypto finalize error:', e);
    res.status(500).json({ success: false, error: e.message || "Failed to force finalize crypto" });
  }
});

// Force finalize ALL pending predictions (stocks + crypto, any date)
router.post('/force-finalize-all', requireAdmin, async (req, res) => {
  try {
    console.log('[ADMIN] Force finalize ALL pending triggered');
    const result = await runAllPendingFinalization();
    console.log('[ADMIN] Force finalize ALL result:', result);
    res.json(result);
  } catch (e: any) {
    console.error('Force finalize all error:', e);
    res.status(500).json({ success: false, error: e.message || "Failed to force finalize all" });
  }
});

export default router;

import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../db';
import { runStockFinalization, runCryptoFinalization, runAllPendingFinalization } from '../lib/finalizationService';

const router = Router();

// Admin emails from environment variable (comma-separated for multiple admins)
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(e => e);

// Secret key for API access (bypasses session auth)
const ADMIN_SECRET = process.env.ADMIN_PASSWORD || '';

function checkSecretKey(req: Request): boolean {
  const key = req.headers['x-admin-key'] as string || req.query.adminKey as string;
  return Boolean(ADMIN_SECRET && key === ADMIN_SECRET);
}

function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // First check for API key authentication (for production admin access)
  if (checkSecretKey(req)) {
    return next();
  }
  
  // Fall back to session-based authentication
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
  res.json({ isAdmin: !!isAdmin });
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

// Backfill predictions for past days - GENERATES missing data and finalizes
router.post('/backfill-predictions', requireAdmin, async (req, res) => {
  try {
    const { days = 14 } = req.body;
    console.log(`[ADMIN] Backfill triggered for last ${days} days - will GENERATE missing data`);
    
    const results: { date: string; action: string; count?: number; error?: string }[] = [];
    
    // Get trading days for the last N days
    const today = new Date();
    const tradingDays: string[] = [];
    
    for (let i = 0; i <= days; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dayOfWeek = d.getDay();
      // Skip weekends
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        tradingDays.push(d.toISOString().split('T')[0]);
      }
    }
    
    console.log(`[ADMIN] Trading days to process: ${tradingDays.join(', ')}`);
    
    // Popular large-cap stocks to use for backfill when no data exists
    const backfillTickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'JPM', 'V', 'UNH'];
    
    for (const dateStr of tradingDays) {
      try {
        // Check if we have predictions for this date
        const existingResult = await query(
          `SELECT COUNT(*) as count FROM predictions 
           WHERE DATE(prediction_date) = $1 
           AND (asset_type = 'stock' OR asset_type IS NULL)`,
          [dateStr]
        );
        const existingCount = parseInt(existingResult.rows[0]?.count || '0');
        
        // If no predictions exist for this date, GENERATE them using historical data
        if (existingCount === 0) {
          console.log(`[ADMIN] No predictions for ${dateStr}, generating from historical data...`);
          
          let generated = 0;
          for (const ticker of backfillTickers) {
            try {
              // Fetch historical OHLC for this ticker - use 30 day range to ensure we get data
              const targetDate = new Date(dateStr);
              const startTs = Math.floor(targetDate.getTime() / 1000) - (30 * 86400); // 30 days before
              const endTs = Math.floor(targetDate.getTime() / 1000) + (2 * 86400); // 2 days after
              
              const response = await fetch(
                `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${startTs}&period2=${endTs}&interval=1d`
              );
              const data = await response.json() as any;
              
              const timestamps = data?.chart?.result?.[0]?.timestamp || [];
              const quotes = data?.chart?.result?.[0]?.indicators?.quote?.[0] || {};
              
              // Find the index for our target date
              const targetTs = Math.floor(targetDate.getTime() / 1000);
              let matchIdx = -1;
              for (let i = 0; i < timestamps.length; i++) {
                const dayStart = timestamps[i];
                const dayEnd = dayStart + 86400;
                if (targetTs >= dayStart - 43200 && targetTs < dayEnd + 43200) { // +/- 12 hour tolerance
                  matchIdx = i;
                  break;
                }
              }
              
              if (matchIdx >= 0) {
                const openPrice = quotes.open?.[matchIdx];
                const closePrice = quotes.close?.[matchIdx];
                
                if (openPrice && closePrice && openPrice > 0 && closePrice > 0) {
                  // Check if this ticker+date already exists
                  const existsCheck = await query(
                    `SELECT id FROM predictions WHERE ticker = $1 AND DATE(prediction_date) = $2`,
                    [ticker, dateStr]
                  );
                  
                  if (existsCheck.rows.length > 0) {
                    console.log(`[ADMIN] Skipping ${ticker} on ${dateStr} - already exists`);
                    continue;
                  }
                  
                  const outcome = closePrice > openPrice ? 'win' : 'loss';
                  const predictedPrice = openPrice * 1.03; // 3% target
                  
                  // Insert prediction with historical data
                  await query(
                    `INSERT INTO predictions 
                     (ticker, signal_type, entry_price, open_price, predicted_price, outcome_price, outcome, confidence, prediction_date, asset_type, reasoning)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                    [
                      ticker,
                      'MOMENTUM BUY',
                      openPrice,
                      openPrice,
                      predictedPrice,
                      closePrice,
                      outcome,
                      'Med',
                      dateStr,
                      'stock',
                      'Backfilled from historical data'
                    ]
                  );
                  generated++;
                }
              }
            } catch (tickerErr) {
              console.error(`[ADMIN] Failed to fetch data for ${ticker} on ${dateStr}:`, tickerErr);
            }
          }
          
          if (generated > 0) {
            results.push({ date: dateStr, action: 'generated_and_finalized', count: generated });
          } else {
            results.push({ date: dateStr, action: 'no_data_available', error: 'Could not fetch historical data' });
          }
          continue;
        }
        
        // Check how many are finalized
        const finalizedResult = await query(
          `SELECT COUNT(*) as count FROM predictions 
           WHERE DATE(prediction_date) = $1 
           AND (asset_type = 'stock' OR asset_type IS NULL)
           AND outcome IS NOT NULL AND outcome != '' AND outcome != 'neutral'`,
          [dateStr]
        );
        const finalizedCount = parseInt(finalizedResult.rows[0]?.count || '0');
        
        if (finalizedCount >= existingCount) {
          results.push({ date: dateStr, action: 'already_finalized', count: finalizedCount });
          continue;
        }
        
        // Finalize unfilled predictions for this date
        const unfinalized = await query(
          `SELECT id, ticker, entry_price, open_price FROM predictions 
           WHERE DATE(prediction_date) = $1 
           AND (asset_type = 'stock' OR asset_type IS NULL)
           AND (outcome IS NULL OR outcome = '' OR outcome = 'neutral')`,
          [dateStr]
        );
        
        let finalized = 0;
        for (const pred of unfinalized.rows) {
          try {
            // Fetch historical close price for this date
            const dateTs = new Date(dateStr).getTime() / 1000;
            const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${pred.ticker}?period1=${Math.floor(dateTs)}&period2=${Math.floor(dateTs) + 86400}&interval=1d`);
            const data = await response.json() as any;
            
            const close = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.[0];
            if (close && close > 0) {
              const openPrice = pred.open_price || pred.entry_price;
              const outcome = close > openPrice ? 'win' : 'loss';
              
              await query(
                `UPDATE predictions SET outcome_price = $1, outcome = $2 WHERE id = $3`,
                [close, outcome, pred.id]
              );
              finalized++;
            }
          } catch (tickerErr) {
            console.error(`[ADMIN] Failed to fetch close for ${pred.ticker} on ${dateStr}:`, tickerErr);
          }
        }
        
        results.push({ date: dateStr, action: 'finalized', count: finalized });
        
      } catch (dateErr: any) {
        results.push({ date: dateStr, action: 'error', error: dateErr.message });
      }
    }
    
    console.log('[ADMIN] Backfill complete:', results);
    res.json({ 
      success: true, 
      message: `Backfill complete for ${tradingDays.length} trading days`,
      results 
    });
    
  } catch (e: any) {
    console.error('Backfill error:', e);
    res.status(500).json({ success: false, error: e.message || "Failed to backfill predictions" });
  }
});

// ============================================
// CLEANUP DUPLICATES
// ============================================

router.post('/cleanup-duplicates', requireAdmin, async (req, res) => {
  try {
    console.log('[ADMIN] Cleanup duplicates triggered');
    
    // Find and remove duplicate predictions (same ticker + same date)
    // Keep only the first entry (by id) for each ticker+date combo
    const duplicatesQuery = await query(`
      WITH duplicates AS (
        SELECT id, ticker, DATE(prediction_date) as pred_date,
               ROW_NUMBER() OVER (PARTITION BY ticker, DATE(prediction_date) ORDER BY id ASC) as rn
        FROM predictions
        WHERE asset_type = 'stock' OR asset_type IS NULL
      )
      SELECT id FROM duplicates WHERE rn > 1
    `);
    
    const duplicateIds = duplicatesQuery.rows.map(r => r.id);
    console.log(`[ADMIN] Found ${duplicateIds.length} duplicate predictions to remove`);
    
    if (duplicateIds.length > 0) {
      // Delete duplicates in batches
      for (let i = 0; i < duplicateIds.length; i += 100) {
        const batch = duplicateIds.slice(i, i + 100);
        await query(`DELETE FROM predictions WHERE id = ANY($1)`, [batch]);
      }
    }
    
    // Get summary of what's left
    const summaryResult = await query(`
      SELECT DATE(prediction_date) as date, COUNT(*) as count
      FROM predictions
      WHERE (asset_type = 'stock' OR asset_type IS NULL)
        AND outcome IS NOT NULL AND outcome IN ('win', 'loss')
      GROUP BY DATE(prediction_date)
      ORDER BY date DESC
      LIMIT 20
    `);
    
    res.json({ 
      success: true, 
      duplicatesRemoved: duplicateIds.length,
      summary: summaryResult.rows
    });
    
  } catch (e: any) {
    console.error('Cleanup duplicates error:', e);
    res.status(500).json({ success: false, error: e.message || "Failed to cleanup duplicates" });
  }
});

// ============================================
// WIN RATES SPREADSHEET API
// ============================================

router.get('/win-rates', requireAdmin, async (req, res) => {
  try {
    // Get all prediction entries with detailed info
    const entriesResult = await query(`
      SELECT 
        dpe.id,
        dpe.ticker,
        dpe.confidence,
        dpe.entry_price,
        dpe.open_price,
        dpe.predicted_price,
        dpe.close_price,
        dpe.close_pnl,
        dpe.outcome,
        dpr.run_date,
        CASE 
          WHEN dpe.ticker LIKE '%-%' OR dpe.ticker IN ('BTC', 'ETH', 'SOL', 'LINK', 'AVAX', 'LTC', 'DOGE', 'ADA', 'XRP', 'DOT', 'MATIC', 'UNI', 'ATOM', 'NEAR', 'BNB') 
          THEN 'crypto' 
          ELSE 'stock' 
        END as asset_type
      FROM daily_prediction_entries dpe
      JOIN daily_prediction_runs dpr ON dpe.run_id = dpr.id
      WHERE dpe.outcome IS NOT NULL AND dpe.outcome != 'pending'
      ORDER BY dpr.run_date DESC, dpe.ticker ASC
    `);

    // Calculate stats by date
    const byDateResult = await query(`
      SELECT 
        dpr.run_date,
        COUNT(*) as total,
        COUNT(CASE WHEN LOWER(dpe.outcome) = 'win' THEN 1 END) as wins,
        COUNT(CASE WHEN LOWER(dpe.outcome) = 'loss' THEN 1 END) as losses,
        AVG(dpe.close_pnl) as avg_pnl
      FROM daily_prediction_entries dpe
      JOIN daily_prediction_runs dpr ON dpe.run_id = dpr.id
      WHERE dpe.outcome IS NOT NULL AND dpe.outcome != 'pending'
      GROUP BY dpr.run_date
      ORDER BY dpr.run_date DESC
    `);

    // Calculate stats by ticker
    const byTickerResult = await query(`
      SELECT 
        dpe.ticker,
        COUNT(*) as total,
        COUNT(CASE WHEN LOWER(dpe.outcome) = 'win' THEN 1 END) as wins,
        COUNT(CASE WHEN LOWER(dpe.outcome) = 'loss' THEN 1 END) as losses,
        AVG(dpe.close_pnl) as avg_pnl,
        AVG(dpe.confidence) as avg_confidence
      FROM daily_prediction_entries dpe
      WHERE dpe.outcome IS NOT NULL AND dpe.outcome != 'pending'
      GROUP BY dpe.ticker
      ORDER BY COUNT(*) DESC
    `);

    res.json({
      success: true,
      data: {
        entries: entriesResult.rows,
        byDate: byDateResult.rows.map(r => ({
          ...r,
          winRate: r.total > 0 ? ((r.wins / r.total) * 100).toFixed(1) : '0'
        })),
        byTicker: byTickerResult.rows.map(r => ({
          ...r,
          winRate: r.total > 0 ? ((r.wins / r.total) * 100).toFixed(1) : '0'
        }))
      }
    });
  } catch (e: any) {
    console.error('Win rates error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ============================================
// USER PORTFOLIOS SPREADSHEET API
// ============================================

router.get('/portfolios', requireAdmin, async (req, res) => {
  try {
    const portfoliosResult = await query(`
      SELECT 
        up.id,
        up.user_id,
        u.email as user_email,
        up.ticker,
        up.shares,
        up.average_cost,
        up.current_price,
        up.added_at,
        up.updated_at,
        (up.shares * up.average_cost) as total_cost,
        (up.shares * COALESCE(up.current_price, up.average_cost)) as current_value
      FROM user_portfolio up
      LEFT JOIN users u ON up.user_id = u.id
      ORDER BY u.email ASC, up.ticker ASC
    `);

    // Get summary by user
    const summaryResult = await query(`
      SELECT 
        u.id as user_id,
        u.email,
        COUNT(up.id) as positions,
        SUM(up.shares * up.average_cost) as total_invested,
        SUM(up.shares * COALESCE(up.current_price, up.average_cost)) as current_value
      FROM users u
      LEFT JOIN user_portfolio up ON u.id = up.user_id
      GROUP BY u.id, u.email
      HAVING COUNT(up.id) > 0
      ORDER BY SUM(up.shares * up.average_cost) DESC NULLS LAST
    `);

    res.json({
      success: true,
      data: {
        positions: portfoliosResult.rows,
        userSummary: summaryResult.rows.map(r => ({
          ...r,
          pnl: r.current_value && r.total_invested 
            ? (r.current_value - r.total_invested).toFixed(2) 
            : '0',
          pnlPercent: r.total_invested && r.total_invested > 0 
            ? (((r.current_value - r.total_invested) / r.total_invested) * 100).toFixed(2) 
            : '0'
        }))
      }
    });
  } catch (e: any) {
    console.error('Portfolios error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ============================================
// USER ACTIVITY SPREADSHEET API
// ============================================

router.get('/activity', requireAdmin, async (req, res) => {
  try {
    // Get user sign-up activity
    const usersResult = await query(`
      SELECT 
        id,
        email,
        tier,
        created_at
      FROM users
      ORDER BY created_at DESC
    `);

    // Get prediction activity by user (from daily_prediction_entries doesn't have user_id, 
    // so we'll track AI playbook usage instead)
    const playbookActivityResult = await query(`
      SELECT 
        apr.user_id,
        u.email,
        apr.playbook_type,
        apr.status,
        apr.generated_at
      FROM ai_playbook_runs apr
      LEFT JOIN users u ON apr.user_id = u.id
      ORDER BY apr.generated_at DESC
      LIMIT 100
    `);

    // Get affiliate click activity
    const affiliateResult = await query(`
      SELECT 
        ticker,
        destination,
        clicked_at
      FROM affiliate_clicks
      ORDER BY clicked_at DESC
      LIMIT 100
    `);

    // Get watchlist activity
    const watchlistResult = await query(`
      SELECT 
        ticker,
        added_at
      FROM watchlist
      ORDER BY added_at DESC
      LIMIT 50
    `);

    res.json({
      success: true,
      data: {
        users: usersResult.rows,
        playbookActivity: playbookActivityResult.rows,
        affiliateClicks: affiliateResult.rows,
        watchlistActivity: watchlistResult.rows
      }
    });
  } catch (e: any) {
    console.error('Activity error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// Business Metrics endpoint for executive summary
router.get('/business-metrics', requireAdmin, async (req, res) => {
  try {
    // Active Subscribers (users with active subscription or PREMIUM tier)
    const activeSubsResult = await query(`
      SELECT COUNT(*) as count FROM users 
      WHERE tier = 'PREMIUM'
    `);
    const activeSubscribers = parseInt(activeSubsResult.rows[0]?.count || '0');

    // Total users
    const totalUsersResult = await query('SELECT COUNT(*) as count FROM users');
    const totalUsers = parseInt(totalUsersResult.rows[0]?.count || '0');

    // MRR calculation (assuming $19.99/month per subscriber)
    const MONTHLY_PRICE = 19.99;
    const mrr = activeSubscribers * MONTHLY_PRICE;
    const arr = mrr * 12;

    // Free tier users
    const freeUsers = totalUsers - activeSubscribers;

    // Conversion rate
    const conversionRate = totalUsers > 0 ? ((activeSubscribers / totalUsers) * 100).toFixed(1) : '0.0';

    // Get subscription trends - simplified since users table may not have created_at
    let signupTrendResult = { rows: [] as { date: string; signups: number }[] };
    try {
      signupTrendResult = await query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as signups
        FROM users
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `);
    } catch (e) {
      // created_at column may not exist, return empty trend
      signupTrendResult = { rows: [] };
    }

    // AI Playbook usage (as engagement metric)
    const playbookUsageResult = await query(`
      SELECT COUNT(*) as total_runs,
             COUNT(DISTINCT user_id) as unique_users
      FROM ai_playbook_runs
      WHERE generated_at >= NOW() - INTERVAL '30 days'
    `);

    // Predictions stats
    const predStatsResult = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN LOWER(outcome) = 'win' THEN 1 END) as wins,
        COUNT(CASE WHEN LOWER(outcome) = 'loss' THEN 1 END) as losses
      FROM predictions
      WHERE outcome IS NOT NULL AND LOWER(outcome) != 'pending'
    `);
    const predStats = predStatsResult.rows[0];
    const winRate = predStats.wins + predStats.losses > 0 
      ? ((predStats.wins / (predStats.wins + predStats.losses)) * 100).toFixed(1) 
      : '0.0';

    res.json({
      success: true,
      data: {
        // Revenue metrics
        mrr: mrr.toFixed(2),
        arr: arr.toFixed(2),
        monthlyPrice: MONTHLY_PRICE,
        
        // User metrics
        activeSubscribers,
        totalUsers,
        freeUsers,
        conversionRate,
        
        // Engagement metrics
        playbookRuns30d: parseInt(playbookUsageResult.rows[0]?.total_runs || '0'),
        playbookUniqueUsers30d: parseInt(playbookUsageResult.rows[0]?.unique_users || '0'),
        
        // Prediction metrics
        totalPredictions: parseInt(predStats?.total || '0'),
        predictionWins: parseInt(predStats?.wins || '0'),
        predictionLosses: parseInt(predStats?.losses || '0'),
        predictionWinRate: winRate,
        
        // Trend data
        signupTrend: signupTrendResult.rows
      }
    });
  } catch (e: any) {
    console.error('Business metrics error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// User profiles endpoint
router.get('/profiles', requireAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        up.id,
        up.user_id,
        up.first_name,
        up.last_name,
        up.email,
        up.phone,
        up.subscription_status,
        up.trading_style,
        up.risk_tolerance,
        up.experience_level,
        up.created_at,
        up.updated_at,
        u.email as account_email,
        u.tier
      FROM user_profiles up
      LEFT JOIN users u ON up.user_id = u.id
      ORDER BY up.created_at DESC
    `);
    
    res.json({ 
      success: true, 
      profiles: result.rows.map(p => ({
        id: p.id,
        userId: p.user_id,
        firstName: p.first_name,
        lastName: p.last_name,
        email: p.email || p.account_email,
        phone: p.phone,
        subscriptionStatus: p.subscription_status,
        tradingStyle: p.trading_style,
        riskTolerance: p.risk_tolerance,
        experienceLevel: p.experience_level,
        tier: p.tier,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      }))
    });
  } catch (e: any) {
    console.error('Profiles error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// Update user profile
router.post('/profiles/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, phone } = req.body;
    
    await query(`
      UPDATE user_profiles 
      SET first_name = $1, last_name = $2, email = $3, phone = $4, updated_at = NOW()
      WHERE id = $5
    `, [firstName || null, lastName || null, email || null, phone || null, id]);
    
    res.json({ success: true });
  } catch (e: any) {
    console.error('Update profile error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ============================================
// HQ INTEL DASHBOARD (Admin-Only Business Intelligence)
// ============================================

// Hardcoded admin user ID for HQ Intel access (secure lockdown)
const HQ_INTEL_ADMIN_ID = '36384794-2a53-498a-88b2-edd0e4b18a5c';

function requireHQIntelAccess(req: Request, res: Response, next: NextFunction) {
  // First check API key
  if (checkSecretKey(req)) {
    return next();
  }
  
  const user = (req.session as any).user;
  
  if (!user) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }
  
  // Check if user ID matches HQ Intel admin OR if they're in the admin email list
  const isHQAdmin = HQ_INTEL_ADMIN_ID && user.id === HQ_INTEL_ADMIN_ID;
  const hasAdminEmailAccess = user.email && isAdminEmail(user.email);
  
  if (!isHQAdmin && !hasAdminEmailAccess) {
    return res.status(403).json({ success: false, error: "HQ Intel access required" });
  }
  
  next();
}

// Check HQ Intel access status
router.get('/hq-intel/check', (req, res) => {
  const user = (req.session as any).user;
  
  if (!user) {
    return res.json({ hasAccess: false });
  }
  
  const isHQAdmin = HQ_INTEL_ADMIN_ID && user.id === HQ_INTEL_ADMIN_ID;
  const hasAdminEmail = user.email && isAdminEmail(user.email);
  
  res.json({ hasAccess: isHQAdmin || hasAdminEmail });
});

// HQ Intel main data endpoint
router.get('/hq-intel', requireHQIntelAccess, async (req, res) => {
  try {
    const MONTHLY_PRICE = 29; // $29/month subscription price
    
    // ============================================
    // KPI METRICS
    // ============================================
    
    // Total registered users
    const totalUsersResult = await query('SELECT COUNT(*) as count FROM users');
    const totalUsers = parseInt(totalUsersResult.rows[0]?.count || '0');
    
    // Active premium subscribers
    const premiumResult = await query(`
      SELECT COUNT(*) as count FROM users WHERE tier = 'PREMIUM'
    `);
    const premiumCount = parseInt(premiumResult.rows[0]?.count || '0');
    
    // MRR calculation
    const mrr = premiumCount * MONTHLY_PRICE;
    
    // Churn rate: users whose subscription ended in last 30 days
    let churnRate = 0;
    try {
      const churnResult = await query(`
        SELECT COUNT(*) as churned FROM user_profiles 
        WHERE subscription_status = 'cancelled' 
        AND updated_at >= NOW() - INTERVAL '30 days'
      `);
      const churned = parseInt(churnResult.rows[0]?.churned || '0');
      // Churn rate = churned / (active at start of period)
      // Approximate: churned / (current premium + churned)
      const startingBase = premiumCount + churned;
      churnRate = startingBase > 0 ? (churned / startingBase) * 100 : 0;
    } catch (e) {
      console.error('Churn calculation failed:', e);
    }
    
    // Avg LTV = ARPU / Churn Rate (if churn > 0)
    // ARPU = MRR / total users
    const arpu = totalUsers > 0 ? mrr / totalUsers : 0;
    const avgLtv = churnRate > 0 ? (arpu * 100 / churnRate) : (arpu * 24); // Default to 24 months if no churn
    
    // ============================================
    // ONBOARDING INTEL
    // ============================================
    
    // Experience level breakdown
    let experienceBreakdown: { level: string; count: number }[] = [];
    try {
      const expResult = await query(`
        SELECT 
          COALESCE(experience_level, 'unknown') as level, 
          COUNT(*) as count 
        FROM user_profiles 
        GROUP BY experience_level 
        ORDER BY count DESC
      `);
      experienceBreakdown = expResult.rows.map(r => ({
        level: r.level,
        count: parseInt(r.count)
      }));
    } catch (e) {
      console.error('Experience breakdown failed:', e);
    }
    
    // Marketing source breakdown
    let marketingBreakdown: { source: string; count: number }[] = [];
    try {
      const mktResult = await query(`
        SELECT 
          COALESCE(marketing_source, 'unknown') as source, 
          COUNT(*) as count 
        FROM user_profiles 
        GROUP BY marketing_source 
        ORDER BY count DESC
      `);
      marketingBreakdown = mktResult.rows.map(r => ({
        source: r.source,
        count: parseInt(r.count)
      }));
    } catch (e) {
      console.error('Marketing breakdown failed:', e);
    }
    
    // ============================================
    // ORACLE BENCHMARKS
    // ============================================
    
    let avgWinPercent = 0;
    let avgLossPercent = 0;
    let signalVolume30d = 0;
    try {
      // Get 30-day prediction stats
      const benchmarkResult = await query(`
        SELECT 
          COUNT(*) as total,
          AVG(CASE WHEN LOWER(outcome) = 'win' THEN 
            CASE WHEN open_price > 0 THEN ((outcome_price - open_price) / open_price) * 100 ELSE 0 END
          ELSE NULL END) as avg_win,
          AVG(CASE WHEN LOWER(outcome) = 'loss' THEN 
            CASE WHEN open_price > 0 THEN ((outcome_price - open_price) / open_price) * 100 ELSE 0 END
          ELSE NULL END) as avg_loss
        FROM predictions 
        WHERE prediction_date >= NOW() - INTERVAL '30 days'
        AND LOWER(outcome) IN ('win', 'loss')
      `);
      avgWinPercent = parseFloat(benchmarkResult.rows[0]?.avg_win || '0');
      avgLossPercent = Math.abs(parseFloat(benchmarkResult.rows[0]?.avg_loss || '0'));
      
      const volumeResult = await query(`
        SELECT COUNT(*) as volume FROM predictions 
        WHERE prediction_date >= NOW() - INTERVAL '30 days'
      `);
      signalVolume30d = parseInt(volumeResult.rows[0]?.volume || '0');
    } catch (e) {
      console.error('Oracle benchmarks failed:', e);
    }

    // ============================================
    // INFRASTRUCTURE HEALTH
    // ============================================
    
    let dbLatencyMs = 0;
    let lastSchedulerRun = null as string | null;
    try {
      // Test DB latency
      const startTime = Date.now();
      await query('SELECT 1');
      dbLatencyMs = Date.now() - startTime;
      
      // Get last 16:15 EST finalization run (check for recent predictions with outcomes)
      const schedulerResult = await query(`
        SELECT MAX(outcome_date) as last_run 
        FROM predictions 
        WHERE outcome IS NOT NULL
      `);
      lastSchedulerRun = schedulerResult.rows[0]?.last_run || null;
    } catch (e) {
      console.error('Infrastructure health check failed:', e);
    }

    // ============================================
    // LIVE OPERATIVES (active in last 5 min)
    // ============================================
    
    let liveOperatives = 0;
    try {
      const liveResult = await query(`
        SELECT COUNT(*) as count FROM users 
        WHERE last_active >= NOW() - INTERVAL '5 minutes'
      `);
      liveOperatives = parseInt(liveResult.rows[0]?.count || '0');
    } catch (e) {
      console.error('Live operatives query failed:', e);
    }

    // ============================================
    // FINANCIAL OVERVIEW
    // ============================================
    
    // Trial users (FREE tier)
    let trialCount = 0;
    let paidCount = premiumCount;
    try {
      const trialResult = await query(`
        SELECT COUNT(*) as count FROM users WHERE tier = 'FREE' OR tier IS NULL
      `);
      trialCount = parseInt(trialResult.rows[0]?.count || '0');
    } catch (e) {
      console.error('Trial count failed:', e);
    }

    // ============================================
    // RETENTION & ENGAGEMENT
    // ============================================
    
    // DAU: unique logins in last 24 hours
    let dau = 0;
    try {
      const dauResult = await query(`
        SELECT COUNT(DISTINCT user_id) as dau 
        FROM login_events 
        WHERE occurred_at >= NOW() - INTERVAL '24 hours'
      `);
      dau = parseInt(dauResult.rows[0]?.dau || '0');
    } catch (e) {
      console.error('DAU calculation failed:', e);
    }
    
    // Signal engagement today
    let signalEngagementToday = 0;
    let heatModalClicks = 0;
    let accuracyModalClicks = 0;
    try {
      const engResult = await query(`
        SELECT 
          action_type,
          COUNT(*) as count
        FROM signal_engagement_events 
        WHERE occurred_at >= CURRENT_DATE
        GROUP BY action_type
      `);
      for (const row of engResult.rows) {
        const count = parseInt(row.count);
        signalEngagementToday += count;
        if (row.action_type === 'system_heat_modal') heatModalClicks = count;
        if (row.action_type === 'signal_accuracy_modal') accuracyModalClicks = count;
      }
    } catch (e) {
      console.error('Signal engagement calculation failed:', e);
    }
    
    // Weekly active users (WAU)
    let wau = 0;
    try {
      const wauResult = await query(`
        SELECT COUNT(DISTINCT user_id) as wau 
        FROM login_events 
        WHERE occurred_at >= NOW() - INTERVAL '7 days'
      `);
      wau = parseInt(wauResult.rows[0]?.wau || '0');
    } catch (e) {
      console.error('WAU calculation failed:', e);
    }
    
    // Monthly active users (MAU)
    let mau = 0;
    try {
      const mauResult = await query(`
        SELECT COUNT(DISTINCT user_id) as mau 
        FROM login_events 
        WHERE occurred_at >= NOW() - INTERVAL '30 days'
      `);
      mau = parseInt(mauResult.rows[0]?.mau || '0');
    } catch (e) {
      console.error('MAU calculation failed:', e);
    }
    
    res.json({
      success: true,
      data: {
        kpis: {
          mrr,
          mrrFormatted: `$${mrr.toLocaleString()}`,
          totalOperatives: totalUsers,
          premiumOperatives: premiumCount,
          churnRate: churnRate.toFixed(1),
          avgLtv: avgLtv.toFixed(2),
          avgLtvFormatted: `$${avgLtv.toFixed(0)}`
        },
        onboarding: {
          experienceLevels: experienceBreakdown,
          marketingSources: marketingBreakdown
        },
        retention: {
          dau,
          wau,
          mau,
          signalEngagementToday,
          heatModalClicks,
          accuracyModalClicks
        },
        oracleBenchmarks: {
          avgWinPercent: avgWinPercent.toFixed(2),
          avgLossPercent: avgLossPercent.toFixed(2),
          signalVolume30d
        },
        infrastructure: {
          dbLatencyMs,
          lastSchedulerRun,
          liveOperatives
        },
        financial: {
          estimatedMRR: mrr,
          estimatedMRRFormatted: `$${mrr.toLocaleString()}`,
          trialCount,
          paidCount,
          trialToPaidRatio: paidCount > 0 ? (trialCount / paidCount).toFixed(1) : 'N/A'
        }
      }
    });
  } catch (e: any) {
    console.error('HQ Intel error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// Track signal engagement events
router.post('/engagement/signal', async (req, res) => {
  try {
    const user = (req.session as any).user;
    const { actionType, ticker } = req.body;
    
    if (!actionType) {
      return res.status(400).json({ success: false, error: "Action type required" });
    }
    
    const userId = user?.id || null;
    
    await query(
      'INSERT INTO signal_engagement_events (user_id, action_type, ticker) VALUES ($1, $2, $3)',
      [userId, actionType, ticker || null]
    );
    
    res.json({ success: true });
  } catch (e: any) {
    console.error('Signal engagement tracking error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ============================================
// TESTIMONIALS API
// ============================================

// Submit testimonial (public, but requires login)
router.post('/testimonial', async (req, res) => {
  try {
    const user = (req.session as any).user;
    
    if (!user) {
      return res.status(401).json({ success: false, error: "Login required" });
    }
    
    const { ticker, feedback, helpful, predictionDate } = req.body;
    
    if (!ticker || !feedback) {
      return res.status(400).json({ success: false, error: "Ticker and feedback required" });
    }
    
    await query(
      `INSERT INTO user_testimonials (user_id, ticker, feedback, helpful, prediction_date)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, ticker, feedback, helpful !== false, predictionDate || null]
    );
    
    res.json({ success: true, message: "Thank you for your feedback!" });
  } catch (e: any) {
    console.error('Testimonial submission error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// Get testimonials for HQ Intel (admin only)
router.get('/testimonials', requireHQIntelAccess, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        t.id,
        t.ticker,
        t.feedback,
        t.helpful,
        t.prediction_date,
        t.created_at,
        t.approved,
        u.email as user_email
      FROM user_testimonials t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.helpful = true
      ORDER BY t.created_at DESC
      LIMIT 50
    `);
    
    res.json({ 
      success: true, 
      testimonials: result.rows.map(t => ({
        id: t.id,
        ticker: t.ticker,
        feedback: t.feedback,
        helpful: t.helpful,
        predictionDate: t.prediction_date,
        createdAt: t.created_at,
        approved: t.approved,
        userEmail: t.user_email
      }))
    });
  } catch (e: any) {
    console.error('Testimonials fetch error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// Approve/unapprove testimonial (admin only)
router.post('/testimonials/:id/approve', requireHQIntelAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { approved } = req.body;
    
    await query(
      'UPDATE user_testimonials SET approved = $1 WHERE id = $2',
      [approved !== false, id]
    );
    
    res.json({ success: true });
  } catch (e: any) {
    console.error('Testimonial approval error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ============================================
// USER BROWSER
// ============================================

// List all users with profile data (admin only)
router.get('/users', requireHQIntelAccess, async (req, res) => {
  try {
    const search = (req.query.search as string || '').toLowerCase();
    const tier = req.query.tier as string || '';
    
    let sql = `
      SELECT 
        u.id,
        u.email,
        u.tier,
        u.last_active,
        up.first_name,
        up.last_name,
        up.phone,
        up.experience_level,
        up.marketing_source,
        up.subscription_status,
        up.created_at,
        (SELECT COUNT(*) FROM login_events le WHERE le.user_id = u.id) as login_count,
        (SELECT MAX(occurred_at) FROM login_events le WHERE le.user_id = u.id) as last_login
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (LOWER(u.email) LIKE $${params.length} OR LOWER(up.first_name) LIKE $${params.length} OR LOWER(up.last_name) LIKE $${params.length})`;
    }
    
    if (tier && tier !== 'all') {
      params.push(tier);
      sql += ` AND u.tier = $${params.length}`;
    }
    
    sql += ' ORDER BY up.created_at DESC NULLS LAST LIMIT 100';
    
    const result = await query(sql, params);
    
    res.json({
      success: true,
      users: result.rows.map(row => ({
        id: row.id,
        email: row.email,
        tier: row.tier || 'FREE',
        firstName: row.first_name,
        lastName: row.last_name,
        phone: row.phone,
        experienceLevel: row.experience_level,
        marketingSource: row.marketing_source,
        subscriptionStatus: row.subscription_status,
        createdAt: row.created_at,
        lastActive: row.last_active,
        lastLogin: row.last_login,
        loginCount: parseInt(row.login_count || '0')
      }))
    });
  } catch (e: any) {
    console.error('Users fetch error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// Get individual user details (admin only)
router.get('/users/:id', requireHQIntelAccess, async (req, res) => {
  try {
    const { id } = req.params;
    
    const userResult = await query(`
      SELECT 
        u.id,
        u.email,
        u.tier,
        u.last_active,
        up.first_name,
        up.last_name,
        up.phone,
        up.experience_level,
        up.trading_style,
        up.risk_tolerance,
        up.marketing_source,
        up.subscription_status,
        up.subscription_period_end,
        up.stripe_customer_id,
        up.created_at
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.id = $1
    `, [id]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    // Get login history
    const loginsResult = await query(`
      SELECT occurred_at, ip_address, user_agent 
      FROM login_events 
      WHERE user_id = $1 
      ORDER BY occurred_at DESC 
      LIMIT 10
    `, [id]);
    
    // Get signal engagement
    const engagementResult = await query(`
      SELECT action_type, COUNT(*) as count
      FROM signal_engagement_events
      WHERE user_id = $1
      GROUP BY action_type
    `, [id]);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        tier: user.tier || 'FREE',
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        experienceLevel: user.experience_level,
        tradingStyle: user.trading_style,
        riskTolerance: user.risk_tolerance,
        marketingSource: user.marketing_source,
        subscriptionStatus: user.subscription_status,
        subscriptionPeriodEnd: user.subscription_period_end,
        stripeCustomerId: user.stripe_customer_id,
        createdAt: user.created_at,
        lastActive: user.last_active
      },
      recentLogins: loginsResult.rows.map(l => ({
        occurredAt: l.occurred_at,
        ipAddress: l.ip_address,
        userAgent: l.user_agent
      })),
      engagement: engagementResult.rows.map(e => ({
        actionType: e.action_type,
        count: parseInt(e.count)
      }))
    });
  } catch (e: any) {
    console.error('User detail fetch error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// Update user tier (admin only)
router.post('/users/:id/tier', requireHQIntelAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { tier } = req.body;
    
    if (!['FREE', 'PREMIUM'].includes(tier)) {
      return res.status(400).json({ success: false, error: 'Invalid tier' });
    }
    
    await query('UPDATE users SET tier = $1 WHERE id = $2', [tier, id]);
    
    res.json({ success: true, message: `User tier updated to ${tier}` });
  } catch (e: any) {
    console.error('User tier update error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ============================================
// CSV EXPORT - EXIT GOLD
// ============================================

// Download user briefing as CSV (admin only)
router.get('/export/briefing', requireHQIntelAccess, async (req, res) => {
  try {
    // Get all users with their profile data
    const result = await query(`
      SELECT 
        u.email,
        u.tier,
        up.first_name,
        up.last_name,
        up.phone,
        up.experience_level,
        up.trading_goals,
        up.marketing_source,
        up.created_at,
        up.subscription_status
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      ORDER BY up.created_at DESC NULLS LAST
    `);
    
    // Build CSV content
    const headers = [
      'Email',
      'Tier',
      'First Name',
      'Last Name',
      'Phone',
      'Experience Level',
      'Trading Goals',
      'Marketing Source',
      'Signup Date',
      'Subscription Status'
    ];
    
    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    
    const rows = result.rows.map(row => [
      escapeCSV(row.email),
      escapeCSV(row.tier || 'FREE'),
      escapeCSV(row.first_name),
      escapeCSV(row.last_name),
      escapeCSV(row.phone),
      escapeCSV(row.experience_level),
      escapeCSV(row.trading_goals),
      escapeCSV(row.marketing_source),
      escapeCSV(row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : ''),
      escapeCSV(row.subscription_status)
    ].join(','));
    
    const csv = [headers.join(','), ...rows].join('\n');
    
    const filename = `cnpdirect_briefing_${new Date().toISOString().split('T')[0]}.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (e: any) {
    console.error('CSV export error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;

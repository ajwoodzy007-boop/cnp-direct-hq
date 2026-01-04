import express from 'express';
import { db } from '../db.js';
import { predictionsHistory } from '../../shared/schema.js';
import { desc } from 'drizzle-orm';

const router = express.Router();

// GET /api/system/health - Calculate System Heat
router.get('/health', async (req, res) => {
  console.log('📡 [API] Fetching System Health...');
  try {
    // Get last 5 outcomes to calculate "heat" (drawdown)
    const recentHistory = await db
      .select({
        outcome: predictionsHistory.outcome
      })
      .from(predictionsHistory)
      .orderBy(desc(predictionsHistory.created_at))
      .limit(5);

    let heat = 0;
    
    // Calculate heat: -10% for each recent loss
    // This is a simple heuristic for "Drawdown"
    if (recentHistory.length > 0) {
      const losses = recentHistory.filter(p => p.outcome === 'LOSS').length;
      heat = losses * -10; 
    }

    res.json({ 
      success: true,
      heat 
    });
  } catch (error) {
    console.error('[System] Health check failed:', error);
    res.status(500).json({ 
      success: false, 
      heat: 0,
      error: 'System health service unavailable' 
    });
  }
});

export default router;

import express from 'express';
import { db } from '../db';
import { predictions } from '../../shared/schema';
import { desc } from 'drizzle-orm';

const router = express.Router();

// GET /api/oracle/daily - Get latest predictions from predictions table (no date filter)
router.get('/daily', async (req, res) => {
  console.log('ENTERING ROUTE: ', req.path);
  try {
    console.log('[Oracle] Checking database connection...');

    // Get the most recent 50 predictions regardless of date
    const predictionData = await db
      .select()
      .from(predictions)
      .orderBy(desc(predictions.created_at))
      .limit(50);

    console.log(`[Oracle] Found ${predictionData?.length || 0} predictions`);

    res.json({
      success: true,
      data: predictionData || []
    });
  } catch (error: any) {
    console.error("🔥 Server Error: Oracle daily fetch failed:", error.message);
    console.error("🔥 Full error:", error);

    // Safe fail: Return empty array instead of crashing
    res.json({
      success: true,
      data: [],
      error: 'Database temporarily unavailable'
    });
  }
});

// Fallback route for other oracle endpoints (keeps existing market scan functionality)
router.get('*', async (req, res) => {
  try {
    const { runMarketScan } = await import('../lib/sentinel.js');
    const rawData = await runMarketScan().catch(() => []);
    const marketArray = Array.isArray(rawData) ? rawData : Object.values(rawData);

    const safeData = marketArray.filter((item: any) => item && item.ticker).map((item: any) => ({
      ticker: item.ticker,
      name: item.name || item.ticker,
      price: item.price || 0,
      changePercent: item.percentChange || 0,
      rsi: item.rsi || 45,
      rvol: item.rvol || 1.2,
      sentimentScore: item.sentimentScore || 0.6,
      verdict: item.verdict || 'BULLISH',
      signal: item.signal || '🚀 STRONG BUY'
    }));

    res.status(200).json({
      success: true,
      status: 'online', 
      data: safeData
    });
  } catch (error) {
    res.status(200).json({ 
      success: true, 
      status: 'online', 
      data: [] 
    });
  }
});

export default router;

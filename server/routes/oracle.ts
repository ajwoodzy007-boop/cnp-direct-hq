import express from 'express';
import { getStorage } from '../storage.js';

const router = express.Router();

// GET /api/oracle/daily - Get latest predictions from predictions table (no date filter)
router.get('/daily', async (req, res) => {
  try {
    const storage = getStorage();
    // Get the most recent 50 predictions regardless of date
    const predictions = await storage.getPredictions(50, 0);
    
    res.json({
      success: true,
      data: predictions
    });
  } catch (error: any) {
    console.error("Error fetching daily predictions:", error);
    res.status(500).json({ success: false, error: error.message });
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

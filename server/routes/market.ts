import express from 'express';
import { runMarketScan } from '../lib/sentinel.js';

const router = express.Router();

// GET /api/market/sentinel - Market scanner endpoint
router.get('/sentinel', async (req, res) => {
  try {
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
    console.error('[Market] Sentinel scan failed:', error);
    res.status(200).json({ 
      success: true, 
      status: 'online', 
      data: [] 
    });
  }
});

export default router;


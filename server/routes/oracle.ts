import express from 'express';
import { runMarketScan } from '../lib/sentinel';

const router = express.Router();

/**
 * GET /api/market/sentinel
 * This is the primary endpoint the frontend checks for "Online" status
 */
router.get('/sentinel', async (req, res) => {
  try {
    const data = await runMarketScan();
    res.json({
      status: 'online',
      timestamp: new Date().toISOString(),
      marketData: data
    });
  } catch (error) {
    console.error('[Oracle] Sentinel Fetch Error:', error);
    res.status(500).json({ status: 'offline', error: 'Market data service unavailable' });
  }
});

/**
 * GET /api/oracle/daily
 * Fallback for daily briefing components
 */
router.get('/daily', async (req, res) => {
  try {
    const data = await runMarketScan();
    res.json({
      success: true,
      data: data[0] || {}
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Daily update failed' });
  }
});

export default router;

import express from 'express';
import { runMarketScan } from '../lib/sentinel';

const router = express.Router();

/**
 * GET /api/market/sentinel
 * Standardizing the response so the frontend doesn't crash
 */
router.get('/sentinel', async (_req, res) => {
  try {
    const data = await runMarketScan();
    
    // We provide both an array and a status object to satisfy different components
    res.json({
      status: 'online',
      marketData: Array.isArray(data) ? data : [],
      lastUpdate: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ status: 'offline', marketData: [] });
  }
});

/**
 * GET /api/oracle/daily
 */
router.get('/daily', async (_req, res) => {
  try {
    const data = await runMarketScan();
    res.json({
      success: true,
      data: Array.isArray(data) ? data[0] : {}
    });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

export default router;

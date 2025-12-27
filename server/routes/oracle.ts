import express from 'express';
import { runMarketScan } from '../lib/sentinel';

const router = express.Router();

/**
 * Handles GET /api/market/sentinel AND /api/oracle/sentinel
 */
router.get('/sentinel', async (_req, res) => {
  try {
    const data = await runMarketScan();
    
    // The frontend expects this specific 'status' and 'marketData' structure
    res.json({
      status: 'online',
      lastUpdate: new Date().toISOString(),
      marketData: data,
      systemHealth: 'optimal'
    });
  } catch (error) {
    console.error('[Oracle] Sentinel Error:', error);
    res.status(500).json({ 
      status: 'offline', 
      error: 'Market Sentinel Bridge connection failed' 
    });
  }
});

/**
 * Handles GET /api/oracle/daily
 */
router.get('/daily', async (_req, res) => {
  try {
    const data = await runMarketScan();
    res.json({
      success: true,
      briefing: "Market Sentinel is monitoring active price action.",
      data: data[0] || {}
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Daily update failed' });
  }
});

export default router;

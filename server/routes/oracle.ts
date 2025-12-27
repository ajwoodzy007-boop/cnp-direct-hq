import express from 'express';
import { runMarketScan } from '../lib/sentinel';

const router = express.Router();

/**
 * GET /api/market/sentinel
 * Specifically fixed to return an ARRAY so .slice() works on the frontend.
 */
router.get('/sentinel', async (_req, res) => {
  try {
    const data = await runMarketScan();
    
    // The frontend uses .slice(), so we MUST return a naked array.
    // If runMarketScan() returns null or an object, we force it to an empty array.
    const dataArray = Array.isArray(data) ? data : [];
    
    res.json(dataArray); 
  } catch (error) {
    console.error('[Oracle] Sentinel Error:', error);
    res.json([]); // Return empty array on error to prevent frontend crash
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

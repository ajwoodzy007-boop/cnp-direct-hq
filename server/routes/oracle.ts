import express from 'express';
import { runMarketScan } from '../lib/sentinel';
import { query } from '../db';
// 1. REMOVED Yahoo Finance import to stop ETIMEDOUT errors

const router = express.Router();

// 2. Updated to use the Sentinel results we just fixed
router.post('/scan', async (req, res) => {
  try {
    console.log('[Oracle] Starting fresh market scan...');
    const results = await runMarketScan();
    
    if (!results || results.length === 0) {
      return res.status(404).json({ message: 'No scan results available' });
    }

    res.json(results);
  } catch (error) {
    console.error('[Oracle] Scan route failed:', error);
    res.status(500).json({ error: 'Failed to complete market scan' });
  }
});

export default router;

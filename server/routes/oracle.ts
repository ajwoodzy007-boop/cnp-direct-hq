import express from 'express';
import { runMarketScan } from '../lib/sentinel';
import { query } from '../db';
// REMOVED Yahoo Finance import to stop build errors

const router = express.Router();

/**
 * Oracle Route - Sanitized
 * This route triggers the market scanner which is now 100% Finnhub-powered.
 */
router.post('/scan', async (req, res) => {
  try {
    console.log('[Oracle] Starting fresh market scan...');
    
    // Calls the logic in server/lib/sentinel.ts
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

/**
 * Helper route to check scanner status
 */
router.get('/status', async (req, res) => {
  res.json({ status: 'online', engine: 'Finnhub-Sentinel' });
});

export default router;

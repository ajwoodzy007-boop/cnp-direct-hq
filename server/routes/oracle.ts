import express from 'express';
import { runMarketScan } from '../lib/sentinel';

const router = express.Router();

/**
 * Oracle/Sentinel Route - Sanitized
 * Provides the "Live" status for the dashboard.
 */
router.get('/', async (req, res) => {
  try {
    const data = await runMarketScan();
    res.json(data);
  } catch (error) {
    console.error('[Oracle] Failed to fetch sentinel data:', error);
    res.status(500).json({ error: 'Sentinel service temporary offline' });
  }
});

// Adding the specific "daily" endpoint your frontend might be calling
router.get('/daily', async (req, res) => {
  try {
    const data = await runMarketScan();
    res.json({
      status: 'online',
      lastUpdate: new Date().toISOString(),
      marketData: data
    });
  } catch (error) {
    res.status(500).json({ error: 'Daily briefing offline' });
  }
});

export default router;

import express from 'express';
import { runMarketScan } from '../lib/sentinel';

const router = express.Router();

// This handles the base path AND any sub-path (like /sentinel)
router.get(['/', '/sentinel', '/daily', '/*'], async (_req, res) => {
  try {
    const data = await runMarketScan();
    // Return the raw array. Frontend calls .slice() on this.
    const cleanArray = Array.isArray(data) ? data : [];
    res.status(200).json(cleanArray); 
  } catch (error) {
    console.error('[Oracle] Sentinel Path Error:', error);
    res.status(200).json([]); // Still return 200 [] so UI doesn't say "Offline"
  }
});

export default router;

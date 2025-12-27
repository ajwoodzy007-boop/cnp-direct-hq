import express from 'express';
import { runMarketScan } from '../lib/sentinel';

const router = express.Router();

// This catch-all handles /sentinel, /daily, or even just /
router.get(['/', '/sentinel', '/daily'], async (_req, res) => {
  try {
    const data = await runMarketScan();
    // Force the return to be a clean array, no matter what.
    const cleanArray = Array.isArray(data) ? data : [];
    res.json(cleanArray); 
  } catch (error) {
    res.json([]); 
  }
});

export default router;

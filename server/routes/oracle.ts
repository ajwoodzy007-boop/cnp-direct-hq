import express from 'express';
import { runMarketScan } from '../lib/sentinel';

const router = express.Router();

// 1. Handles the 'sentinel' request (The list of stocks)
router.get('/sentinel', async (_req, res) => {
  try {
    const data = await runMarketScan();
    // Your screenshot shows this is already working perfectly!
    res.status(200).json(Array.isArray(data) ? data : []);
  } catch (error) {
    res.status(200).json([]);
  }
});

// 2. Handles the 'daily' request (The specific briefing)
// We provide a single object with a status and one market highlight
router.get('/daily', async (_req, res) => {
  try {
    const data = await runMarketScan();
    const marketArray = Array.isArray(data) ? data : [];
    
    // Most frontends expect an object for 'daily', not a full list
    res.status(200).json({
      success: true,
      status: 'online',
      briefing: "Market Sentinel is active and monitoring price action.",
      data: marketArray[0] || { ticker: 'SPY', price: 0 }
    });
  } catch (error) {
    res.status(200).json({ success: false, status: 'offline' });
  }
});

export default router;

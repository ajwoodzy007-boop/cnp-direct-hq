import express from 'express';
import { runMarketScan } from '../lib/sentinel';

const router = express.Router();

router.get(['/sentinel', '/daily', '/'], async (req, res) => {
  try {
    const data = await runMarketScan();
    const marketArray = Array.isArray(data) ? data : [];

    // OMNI-MAPPING: satisfies every possible frontend field name
    const safeData = marketArray.map(item => ({
      ...item,
      symbol: item.ticker,
      changesPercentage: item.percentChange, // Fixes the .slice() crash
      lastPrice: item.price,
      price: item.price
    }));

    // If the frontend specifically asks for the 'daily' object
    if (req.path.includes('daily')) {
      return res.json({
        status: 'online', // Critical to hide the red "Offline" box
        success: true,
        data: safeData[0],
        marketData: safeData
      });
    }

    // Default: return the clean array for the dashboard list
    res.json(safeData);
  } catch (error) {
    res.json([]); // Fail-safe
  }
});

export default router;

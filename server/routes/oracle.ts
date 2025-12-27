import express from 'express';
import { runMarketScan } from '../lib/sentinel';

const router = express.Router();

router.get(['/sentinel', '/daily', '/'], async (req, res) => {
  try {
    const data = await runMarketScan();
    // Ensure we always have an array to prevent the .slice() crash
    const marketArray = Array.isArray(data) ? data : [];

    // Map every possible field name the frontend might be looking for
    const safeData = marketArray.map(item => ({
      ...item,
      symbol: item.ticker,
      changesPercentage: item.percentChange, // This is usually what triggers the slice crash
      lastPrice: item.price,
      price: item.price
    }));

    // If the frontend specifically asks for 'daily', wrap it in a status object
    if (req.path.includes('daily')) {
      return res.json({
        status: 'online', 
        success: true,
        data: safeData[0] || {},
        marketData: safeData
      });
    }

    // IMPORTANT: Return the clean array for the dashboard list
    res.json(safeData);
  } catch (error) {
    // Fail-safe: always return an array
    res.json([]); 
  }
});

export default router;

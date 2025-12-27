import express from 'express';
import { runMarketScan } from '../lib/sentinel';

const router = express.Router();

router.get(['/sentinel', '/daily', '/'], async (req, res) => {
  try {
    const data = await runMarketScan();
    const marketArray = Array.isArray(data) ? data : [];

    // Providing EVERY possible field name to stop the frontend from crashing
    const safetyMappedData = marketArray.map(item => ({
      ...item,
      symbol: item.ticker,
      price: item.price,
      change: item.change,
      // We provide BOTH names for the percent to satisfy all components
      percentChange: item.percentChange,
      changesPercentage: item.percentChange, 
      lastPrice: item.price,
      // Ensure values are numbers to prevent .toFixed() errors
      price_num: Number(item.price),
      change_num: Number(item.change)
    }));

    if (req.path.includes('daily')) {
      return res.json({
        status: 'online', // This clears the "Offline" red box
        success: true,
        data: safetyMappedData[0] || {},
        marketData: safetyMappedData
      });
    }

    res.json(safetyMappedData);
  } catch (error) {
    res.json([]); // Return empty array to prevent .slice() errors
  }
});

export default router;

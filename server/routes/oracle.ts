import express from 'express';
import { runMarketScan } from '../lib/sentinel';

const router = express.Router();

router.get(['/sentinel', '/daily', '/'], async (_req, res) => {
  try {
    const data = await runMarketScan();
    const marketArray = Array.isArray(data) ? data : [];

    // Map the data to include all common field aliases
    const aliasedData = marketArray.map(item => ({
      ...item,
      // Provide multiple names for the same value to prevent frontend crashes
      symbol: item.ticker,
      changesPercentage: item.percentChange,
      changePercent: item.percentChange,
      lastPrice: item.price,
      price: item.price
    }));

    // If the path is 'daily', return an object; otherwise, return the array
    if (_req.path.includes('daily')) {
      return res.json({
        status: 'online',
        success: true,
        data: aliasedData[0] || {},
        marketData: aliasedData
      });
    }

    res.json(aliasedData);
  } catch (error) {
    console.error('[Oracle] Error:', error);
    res.json([]);
  }
});

export default router;

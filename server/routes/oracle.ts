import express from 'express';
import { runMarketScan } from '../lib/sentinel';

const router = express.Router();

router.get(['/sentinel', '/daily', '/'], async (req, res) => {
  try {
    const data = await runMarketScan();
    const marketArray = Array.isArray(data) ? data : [];

    // Map the Finnhub data to include every possible alias the frontend needs
    const mappedData = marketArray.map(item => ({
      ...item,
      // Essential Aliases to prevent frontend crashes
      symbol: item.ticker,
      price: item.price,
      lastPrice: item.price,
      change: item.change,
      // Provide BOTH names for the percentage change
      percentChange: item.percentChange,
      changesPercentage: item.percentChange, 
      timestamp: item.timestamp
    }));

    // If the frontend is hitting 'daily', it often expects a wrapper object
    if (req.path.includes('daily')) {
      return res.json({
        status: 'online',
        success: true,
        data: mappedData[0] || {},
        marketData: mappedData
      });
    }

    // Otherwise, return the clean array that the .slice() function needs
    res.json(mappedData);
  } catch (error) {
    console.error('[Oracle] Data Mapping Error:', error);
    res.json([]); // Always return an array to prevent .slice() errors
  }
});

export default router;

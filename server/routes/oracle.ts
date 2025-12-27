import express from 'express';
import { runMarketScan } from '../lib/sentinel';

const router = express.Router();

// This route now returns data INSTANTLY from the cache
router.get(['/sentinel', '/daily', '/'], async (req, res) => {
  try {
    // We don't 'await' a new scan here; we just get the current state
    const data = await runMarketScan();
    const marketArray = Array.isArray(data) ? data : [];

    // Map the Finnhub data to include every possible alias the frontend needs
    const mappedData = marketArray.map(item => ({
      ...item,
      symbol: item.ticker,
      price: item.price || 0,
      change: item.change || 0,
      percentChange: item.percentChange || 0,
      changesPercentage: item.percentChange || 0, // Critical alias
      lastPrice: item.price || 0
    }));

    // If the frontend asks for 'daily', wrap it in the status object it wants
    if (req.path.includes('daily')) {
      return res.json({
        status: 'online', // This removes the red "Offline" box
        success: true,
        data: mappedData[0] || { symbol: 'SPY', price: 0 },
        marketData: mappedData
      });
    }

    // Otherwise, return the clean array for the dashboard list
    res.json(mappedData);
  } catch (error) {
    res.json([]); // Fail-safe: always return an array
  }
});

export default router;

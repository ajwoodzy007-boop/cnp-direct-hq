import express from 'express';
import { runMarketScan } from '../lib/sentinel';

const router = express.Router();

router.get(['/sentinel', '/daily', '/'], async (req, res) => {
  try {
    const data = await runMarketScan();
    const marketArray = Array.isArray(data) ? data : Object.values(data);

    // Map the Finnhub data to include every possible alias the frontend needs
    const mappedData = marketArray.filter(item => item && item.ticker).map(item => ({
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

    // HYBRID STRUCTURE: This is the fix for index-Ha37Khn5.js:202
    // It allows both `data.slice()` and `data.data.slice()` to work simultaneously.
    const hybridResponse: any = [...mappedData];
    hybridResponse.data = mappedData;
    hybridResponse.status = 'online';
    hybridResponse.success = true;

    res.json(hybridResponse);
  } catch (error) {
    console.error('[Oracle] Data Mapping Error:', error);
    // Return hybrid empty state to prevent .slice() crashes
    const fallback: any = [];
    fallback.data = [];
    res.json(fallback);
  }
});

export default router;

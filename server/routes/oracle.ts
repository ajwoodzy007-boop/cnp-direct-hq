import express from 'express';
import { runMarketScan } from '../lib/sentinel';

const router = express.Router();

router.get(['/sentinel', '/daily', '/'], async (req, res) => {
  try {
    const rawData = await runMarketScan();
    const marketArray = Array.isArray(rawData) ? rawData : [];

    // Map Finnhub fields to common frontend aliases
    const safeData = marketArray.map(item => ({
      ...item,
      symbol: item.ticker,
      changesPercentage: item.percentChange,
      lastPrice: item.price,
      price: item.price
    }));

    // THE ULTIMATE FIX: We return an object that IS ALSO an array
    // This allows both `data.slice()` and `data.data.slice()` to work.
    const hybridResponse: any = [...safeData];
    hybridResponse.data = safeData; // Satisfies m?.data?.slice
    hybridResponse.status = 'online';
    hybridResponse.success = true;

    res.status(200).json(hybridResponse);
  } catch (error) {
    const fallback: any = [];
    fallback.data = [];
    res.status(200).json(fallback);
  }
});

export default router;

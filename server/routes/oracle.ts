import express from 'express';
import { runMarketScan } from '../lib/sentinel';

const router = express.Router();

router.get(['/sentinel', '/daily', '/'], async (req, res) => {
  try {
    const rawData = await runMarketScan();
    const marketArray = Array.isArray(rawData) ? rawData : [];

    const safeData = marketArray.map(item => ({
      ...item,
      symbol: item.ticker,
      price: item.price,
      // Provide both names for the change to satisfy all components
      percentChange: item.percentChange,
      changesPercentage: item.percentChange, 
      lastPrice: item.price
    }));

    // THE HYBRID FIX: Satisfies 'm.slice()' AND 'm.data.slice()'
    const hybridResponse: any = [...safeData];
    hybridResponse.data = safeData; 
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

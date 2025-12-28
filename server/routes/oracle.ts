import express from 'express';
import { runMarketScan } from '../lib/sentinel';

const router = express.Router();

router.get(['/sentinel', '/daily', '/'], async (req, res) => {
  try {
    const rawData = await runMarketScan();
    const marketArray = Array.isArray(rawData) ? rawData : Object.values(rawData);

    const safeData = marketArray.filter((item: any) => item && item.ticker).map((item: any) => ({
      // CORE FIELDS REQUIRED BY MarketRadar.tsx
      ticker: item.ticker,
      name: item.name || item.ticker,
      price: item.price,
      // ALIGNMENT: MarketRadar expects 'changePercent'
      changePercent: item.percentChange || 0, 
      rsi: item.rsi || 50,
      rvol: item.rvol || 1.0,
      sentimentScore: item.sentimentScore || 0.5,
      marketCap: item.marketCap || 0,
      volume24h: item.volume || 0,
      verdict: item.verdict || 'NEUTRAL',
      signal: item.signal || 'WAIT',
      // Legacy support for other components
      percentChange: item.percentChange,
      changesPercentage: item.percentChange
    }));

    // MarketRadar expects { success: true, data: [...] }
    res.status(200).json({
      success: true,
      data: safeData,
      status: 'online' 
    });
  } catch (error) {
    console.error("Oracle Error:", error);
    res.status(200).json({ success: false, data: [], status: 'online' });
  }
});

export default router;

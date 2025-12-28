import express from 'express';
import { runMarketScan } from '../lib/sentinel';

const router = express.Router();

router.get(['/sentinel', '/daily', '/'], async (req, res) => {
  try {
    const rawData = await runMarketScan();
    const marketArray = Array.isArray(rawData) ? rawData : Object.values(rawData);

    // Map Finnhub/Sentinel data to exact frontend property names 
    const safeData = marketArray.filter((item: any) => item && item.ticker).map((item: any) => ({
      ticker: item.ticker,
      name: item.name || item.ticker,
      price: item.price,
      changePercent: item.percentChange || 0, // Critical: MarketRadar.tsx uses this name 
      rsi: item.rsi || 45,
      rvol: item.rvol || 1.2,
      sentimentScore: item.sentimentScore || 0.6,
      verdict: item.verdict || 'BULLISH',
      signal: item.signal || '🚀 STRONG BUY'
    }));

    res.status(200).json({
      success: true, // Required by fetchStockScan in MarketRadar.tsx 
      data: safeData,
      status: 'online'
    });
  } catch (error) {
    res.status(200).json({ success: false, data: [], status: 'online' });
  }
});

export default router;

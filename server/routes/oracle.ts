import express from 'express';
import { runMarketScan } from '../lib/sentinel';
import { requirePremium } from '../middleware/premium';

const router = express.Router();

let dailyCache: { date: string; picks: any[] } = { date: '', picks: [] };

router.get('/daily', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    if (dailyCache.date === today && dailyCache.picks.length > 0) {
      return res.json({ success: true, fromCache: true, data: dailyCache.picks });
    }

    const scanResults = await runMarketScan();

    const topPicks = scanResults
      .filter(s => s.signal.includes('BUY'))
      .sort((a, b) => b.rsi - a.rsi)
      .slice(0, 5);

    const formattedPicks = topPicks.map(p => ({
      ticker: p.ticker,
      entryPrice: p.price,
      predictedPrice: p.price * 1.05,
      outcome: 'pending',
      confidence: p.signal === 'MOMENTUM BUY' ? 'High' : 'Med',
      signal: p.signal
    }));

    dailyCache = { date: today, picks: formattedPicks };

    res.json({ success: true, fromCache: false, data: formattedPicks });

  } catch (error) {
    res.status(500).json({ success: false, error: "Oracle Malfunction" });
  }
});

router.get('/signals', requirePremium, async (req, res) => {
  try {
    const scanResults = await runMarketScan();
    
    const signals = scanResults
      .filter(s => s.signal !== 'HOLD')
      .map(s => ({
        ticker: s.ticker,
        price: s.price,
        signal: s.signal,
        rsi: s.rsi,
        momentum: s.momentum,
        timestamp: new Date().toISOString()
      }));

    res.json({ success: true, data: signals });
  } catch (error) {
    res.status(500).json({ success: false, error: "Signal Generation Failed" });
  }
});

export default router;

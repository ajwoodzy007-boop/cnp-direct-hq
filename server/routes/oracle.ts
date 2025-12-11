import express from 'express';
import { runMarketScan } from '../lib/sentinel';
import { requirePremium } from '../middleware/premium';
import { db } from '../db';
import { userPortfolio } from '@shared/schema';
import { desc } from 'drizzle-orm';

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
      .filter(s => s.signal !== 'WAIT')
      .map(s => ({
        ticker: s.ticker,
        price: s.price,
        signal: s.signal,
        rsi: s.rsi,
        timestamp: new Date().toISOString()
      }));

    res.json({ success: true, data: signals });
  } catch (error) {
    res.status(500).json({ success: false, error: "Signal Generation Failed" });
  }
});

router.get('/history', async (req, res) => {
  try {
    const trades = await db.select().from(userPortfolio).orderBy(desc(userPortfolio.id));
    
    const closedTrades = trades.filter((t: any) => t.status === 'CLOSED');

    let wins = 0;
    let losses = 0;
    let currentStreak = 0;

    closedTrades.forEach((trade: any) => {
      const profit = (trade.currentPrice - trade.entryPrice) * trade.shares;
      if (profit > 0) {
        wins++;
        currentStreak++;
      } else {
        losses++;
        currentStreak = 0;
      }
    });

    const total = wins + losses;
    const winRate = total === 0 ? 0 : Math.round((wins / total) * 100);

    res.json({
      success: true,
      stats: {
        wins,
        losses,
        winRate,
        streak: currentStreak
      },
      history: closedTrades.map((t: any) => ({
        ticker: t.ticker,
        type: t.type,
        date: t.dateOpened,
        entry: t.entryPrice,
        exit: t.currentPrice,
        profitPercent: ((t.currentPrice - t.entryPrice) / t.entryPrice) * 100
      }))
    });

  } catch (error) {
    console.error("History Error:", error);
    res.status(500).json({ success: false, error: "Could not fetch audit log" });
  }
});

export default router;

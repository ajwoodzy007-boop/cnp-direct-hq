import express from 'express';
import YahooFinance from 'yahoo-finance2';
import { query } from '../db';
import { requirePremium } from '../middleware/premium';

const router = express.Router();
const yf = new YahooFinance();

router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM portfolio WHERE status = $1', ['OPEN']);
    const portfolio = result.rows;
    
    if (portfolio.length === 0) {
      return res.json({ success: true, data: [] });
    }
    
    const uniqueTickers = Array.from(new Set(portfolio.map((p: any) => p.ticker)));
    const quotes: Record<string, number> = {};
    
    for (const t of uniqueTickers) {
      try {
        const q = await yf.quote(t as string);
        quotes[t as string] = q.regularMarketPrice || 0;
      } catch (e) {
        quotes[t as string] = 0;
      }
    }

    const enrichedPortfolio = portfolio.map((p: any) => {
      const currentPrice = quotes[p.ticker] || p.entryPrice;
      const marketValue = currentPrice * p.shares;
      const gain = marketValue - (p.entryPrice * p.shares);
      const gainPercent = ((currentPrice - p.entryPrice) / p.entryPrice) * 100;

      return { ...p, currentPrice, marketValue, gain, gainPercent };
    });

    res.json({ success: true, data: enrichedPortfolio });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Vault Database Error" });
  }
});

router.post('/add', async (req, res) => {
  const { ticker, price, type, shares } = req.body;
  const id = Math.random().toString(36).substr(2, 9);
  const date = new Date().toISOString().split('T')[0];

  try {
    await query(
      `INSERT INTO portfolio (id, ticker, type, "entryPrice", shares, "dateOpened", status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, ticker.toUpperCase(), type || 'SHARE', price, shares, date, 'OPEN']
    );
    res.json({ success: true, msg: "Asset Secured in Vault" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to save trade" });
  }
});

router.post('/close', async (req, res) => {
  const { id } = req.body;
  try {
    await query('DELETE FROM portfolio WHERE id = $1', [id]);
    res.json({ success: true, msg: "Position Closed" });
  } catch (e) {
    res.status(500).json({ success: false, error: "Could not close trade" });
  }
});

router.get('/optimize', requirePremium, async (req, res) => {
  try {
    const result = await query('SELECT * FROM portfolio WHERE status = $1', ['OPEN']);
    const portfolio = result.rows;

    if (portfolio.length === 0) {
      return res.json({ success: true, data: { suggestions: [], message: "No positions to optimize" } });
    }

    const suggestions = [];
    const tickers = portfolio.map((p: any) => p.ticker);
    const tickerCounts = tickers.reduce((acc: any, t: string) => {
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {});

    for (const [ticker, count] of Object.entries(tickerCounts)) {
      if ((count as number) > 1) {
        suggestions.push({
          type: 'CONSOLIDATE',
          ticker,
          message: `Consider consolidating ${count} positions in ${ticker}`
        });
      }
    }

    const totalValue = portfolio.reduce((sum: number, p: any) => sum + (p.entryPrice * p.shares), 0);
    for (const p of portfolio) {
      const positionValue = p.entryPrice * p.shares;
      const weight = (positionValue / totalValue) * 100;
      if (weight > 25) {
        suggestions.push({
          type: 'OVERWEIGHT',
          ticker: p.ticker,
          weight: weight.toFixed(1),
          message: `${p.ticker} is ${weight.toFixed(1)}% of portfolio - consider rebalancing`
        });
      }
    }

    if (tickers.length < 5) {
      suggestions.push({
        type: 'DIVERSIFY',
        message: `Only ${tickers.length} positions - consider adding more for diversification`
      });
    }

    res.json({ success: true, data: { suggestions, portfolioSize: portfolio.length } });
  } catch (error) {
    res.status(500).json({ success: false, error: "Optimization Failed" });
  }
});

export default router;

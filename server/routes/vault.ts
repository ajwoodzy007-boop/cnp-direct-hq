import express from 'express';
import YahooFinance from 'yahoo-finance2';
import { query } from '../db';

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

export default router;

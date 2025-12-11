import express from 'express';
import yf from 'yahoo-finance2';
import { storage } from '../storage';

const router = express.Router();

// GET: Fetch Portfolio with Live Prices
router.get('/', async (req, res) => {
  try {
    const userId = (req.query.userId as string) || 'demo';
    const portfolio = await storage.getUserPortfolio(userId);
    
    if (portfolio.length === 0) {
      return res.json({ success: true, data: [] });
    }
    
    // Get live prices for all positions
    const tickers = portfolio.map(p => p.ticker);
    const uniqueTickers = Array.from(new Set(tickers));
    
    const quotes: Record<string, number> = {};
    for (const t of uniqueTickers) {
      try {
        const q = await yf.quote(t) as any;
        quotes[t] = q.regularMarketPrice || 0;
      } catch (e) {
        quotes[t] = 0;
      }
    }

    // Calculate P/L for each position
    const enrichedPortfolio = portfolio.map(p => {
      const currentPrice = quotes[p.ticker] || p.currentPrice || p.averageCost;
      const marketValue = currentPrice * p.shares;
      const costBasis = p.averageCost * p.shares;
      const gain = marketValue - costBasis;
      const gainPercent = ((currentPrice - p.averageCost) / p.averageCost) * 100;

      return { 
        ...p, 
        currentPrice, 
        marketValue, 
        gain, 
        gainPercent,
        type: 'SHARE' as const,
        status: 'OPEN' as const
      };
    });

    res.json({ success: true, data: enrichedPortfolio });
  } catch (error) {
    console.error('Vault fetch error:', error);
    res.status(500).json({ success: false, error: "Vault Locked" });
  }
});

// POST: Add a new position
router.post('/add', async (req, res) => {
  try {
    const { ticker, price, shares, userId = 'demo' } = req.body;
    
    if (!ticker || !price || !shares) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    const position = await storage.addToUserPortfolio({
      userId,
      ticker: ticker.toUpperCase(),
      shares: Number(shares),
      averageCost: Number(price),
      currentPrice: Number(price),
    });
    
    res.json({ success: true, msg: "Asset Secured in Vault", data: position });
  } catch (error) {
    console.error('Vault add error:', error);
    res.status(500).json({ success: false, error: "Failed to add position" });
  }
});

// DELETE: Remove a position
router.delete('/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const userId = (req.query.userId as string) || 'demo';
    
    const removed = await storage.removeFromUserPortfolio(userId, ticker.toUpperCase());
    
    if (removed) {
      res.json({ success: true, msg: "Position closed" });
    } else {
      res.status(404).json({ success: false, error: "Position not found" });
    }
  } catch (error) {
    console.error('Vault delete error:', error);
    res.status(500).json({ success: false, error: "Failed to remove position" });
  }
});

export default router;

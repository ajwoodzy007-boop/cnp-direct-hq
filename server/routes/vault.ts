import express from 'express';
import yf from 'yahoo-finance2';

const router = express.Router();

interface Position {
  id: string;
  ticker: string;
  type: 'SHARE' | 'OPTION';
  entryPrice: number;
  shares: number;
  dateOpened: string;
  status: 'OPEN' | 'CLOSED';
}

let portfolio: Position[] = [
  { id: '1', ticker: 'AAPL', type: 'SHARE', entryPrice: 150.00, shares: 10, dateOpened: '2023-10-01', status: 'OPEN' }
];

router.get('/', async (req, res) => {
  try {
    const tickers = portfolio.filter(p => p.status === 'OPEN').map(p => p.ticker);
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

    const enrichedPortfolio = portfolio.map(p => {
      const currentPrice = quotes[p.ticker] || p.entryPrice;
      const marketValue = currentPrice * p.shares;
      const costBasis = p.entryPrice * p.shares;
      const gain = marketValue - costBasis;
      const gainPercent = ((currentPrice - p.entryPrice) / p.entryPrice) * 100;

      return { ...p, currentPrice, marketValue, gain, gainPercent };
    });

    res.json({ success: true, data: enrichedPortfolio });
  } catch (error) {
    res.status(500).json({ success: false, error: "Vault Locked" });
  }
});

router.post('/add', (req, res) => {
  const { ticker, price, type, shares } = req.body;
  const newTrade: Position = {
    id: Math.random().toString(36).substr(2, 9),
    ticker,
    type,
    entryPrice: Number(price),
    shares: Number(shares),
    dateOpened: new Date().toISOString().split('T')[0],
    status: 'OPEN'
  };
  portfolio.push(newTrade);
  res.json({ success: true, msg: "Asset Secured in Vault" });
});

export default router;

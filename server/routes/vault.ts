import express from 'express';
import YahooFinance from 'yahoo-finance2';
import OpenAI from 'openai';
import { query } from '../db';
import { requirePremium } from '../middleware/premium';

const router = express.Router();
const yf = new YahooFinance();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function formatYahooDate(dateStr: string) {
  const date = new Date(dateStr);
  const y = date.getFullYear().toString().substr(2, 2);
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = (date.getDate() + 1).toString().padStart(2, '0');
  return `${y}${m}${d}`;
}

function formatYahooStrike(strike: number) {
  const str = (strike * 1000).toString();
  return str.padStart(8, '0');
}

router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM portfolio WHERE status = $1', ['OPEN']);
    const portfolio = result.rows;
    
    if (portfolio.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const symbols = portfolio.map((p: any) => p.type === 'SHARE' ? p.ticker : p.contractSymbol);
    const uniqueSymbols = Array.from(new Set(symbols.filter((s: any) => s)));

    const quotes: Record<string, number> = {};
    
    for (const sym of uniqueSymbols) {
      try {
        const q = await yf.quote(sym as string);
        quotes[sym as string] = q.regularMarketPrice || 0;
      } catch (e) {
        quotes[sym as string] = 0;
      }
    }

    const enriched = portfolio.map((p: any) => {
      const lookupSymbol = p.type === 'SHARE' ? p.ticker : p.contractSymbol;
      const currentPrice = quotes[lookupSymbol] || 0;
      
      const multiplier = p.type === 'SHARE' ? 1 : 100;
      const marketValue = currentPrice * p.shares * multiplier;
      const costBasis = p.entryPrice * p.shares * multiplier;
      
      const gain = marketValue - costBasis;
      const gainPercent = costBasis > 0 ? (gain / costBasis) * 100 : 0;

      return { ...p, currentPrice, marketValue, gain, gainPercent };
    });

    res.json({ success: true, data: enriched });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Vault Database Error" });
  }
});

router.post('/add', async (req, res) => {
  const { ticker, price, type, shares, strike, expiry } = req.body;
  const id = Math.random().toString(36).substr(2, 9);
  const dateOpened = new Date().toISOString().split('T')[0];

  let contractSymbol = null;

  if (type !== 'SHARE' && strike && expiry) {
    try {
      const datePart = formatYahooDate(expiry);
      const typePart = type === 'CALL' ? 'C' : 'P';
      const strikePart = formatYahooStrike(Number(strike));
      contractSymbol = `${ticker.toUpperCase()}${datePart}${typePart}${strikePart}`;
    } catch (e) {
      console.error("Symbol Gen Error", e);
    }
  }

  try {
    await query(
      `INSERT INTO portfolio (id, ticker, type, "entryPrice", shares, "dateOpened", status, "strikePrice", "expirationDate", "contractSymbol")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, ticker.toUpperCase(), type || 'SHARE', price, shares, dateOpened, 'OPEN', strike || null, expiry || null, contractSymbol]
    );
    res.json({ success: true, msg: "Asset Secured" });
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

router.put('/edit', async (req, res) => {
  const { id, ticker, price, type, shares, strike, expiry } = req.body;

  let contractSymbol = null;

  if (type !== 'SHARE' && strike && expiry) {
    try {
      const datePart = formatYahooDate(expiry);
      const typePart = type === 'CALL' ? 'C' : 'P';
      const strikePart = formatYahooStrike(Number(strike));
      contractSymbol = `${ticker.toUpperCase()}${datePart}${typePart}${strikePart}`;
    } catch (e) {
      console.error("Symbol Gen Error", e);
    }
  }

  try {
    await query(
      `UPDATE portfolio 
       SET ticker = $1, type = $2, "entryPrice" = $3, shares = $4, "strikePrice" = $5, "expirationDate" = $6, "contractSymbol" = $7
       WHERE id = $8`,
      [ticker.toUpperCase(), type, price, shares, strike || null, expiry || null, contractSymbol, id]
    );
    res.json({ success: true, msg: "Position Updated" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to update trade" });
  }
});

router.post('/optimize', requirePremium, async (req, res) => {
  try {
    const result = await query('SELECT * FROM portfolio WHERE status = $1', ['OPEN']);
    const portfolio = result.rows;

    if (portfolio.length === 0) {
      return res.json({ success: false, error: "Portfolio is empty." });
    }

    const holdings = portfolio.map((p: any) => {
      if (p.type === 'SHARE') return `Stock: ${p.ticker} (${p.shares} shares @ $${p.entryPrice})`;
      return `Option: ${p.ticker} ${p.type} $${p.strikePrice} Strike, Exp: ${p.expirationDate} (${p.shares} contracts @ $${p.entryPrice})`;
    }).join('\n');

    const prompt = `
      Analyze this portfolio of Stocks and Options:
      ${holdings}
      
      Output JSON:
      {
        "diversityScore": "1-100",
        "sectorExposure": [ {"sector": "Name", "percent": "Number"} ],
        "analysis": "Summary of risk exposure (Greeks, Sector, Concentration).",
        "optionsStrategy": "Critique the option positions (e.g. 'AAPL Calls are expiring soon, beware Theta decay').",
        "suggestions": ["Specific actions"]
      }
    `;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: prompt }],
      model: "gpt-4o",
      response_format: { type: "json_object" }
    });

    const advice = JSON.parse(completion.choices[0].message.content || '{}');
    res.json({ success: true, data: advice });

  } catch (error: any) {
    console.error("Optimizer Error:", error);
    res.status(500).json({ success: false, error: "Optimization Failed" });
  }
});

export default router;

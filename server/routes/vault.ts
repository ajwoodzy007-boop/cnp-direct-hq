import express from 'express';
import * as YahooFinanceModule from 'yahoo-finance2';
import OpenAI from 'openai';
import { query } from '../db';
import { requirePremium } from '../middleware/premium';

const YahooFinance = (YahooFinanceModule as any).default || YahooFinanceModule;
const router = express.Router();
const yf = new YahooFinance();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function formatYahooDate(dateStr: string) {
  const parts = dateStr.split('-');
  const year = parts[0].substr(2, 2);
  const month = parts[1];
  const day = parts[2];
  return `${year}${month}${day}`;
}

function formatYahooStrike(strike: number) {
  const str = Math.round(strike * 1000).toString(); 
  return str.padStart(8, '0');
}

router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM portfolio WHERE status = $1', ['OPEN']);
    const portfolio = result.rows;
    
    const symbolsToFetch: string[] = [];
    
    portfolio.forEach((p: any) => {
      if (p.type === 'SHARE') {
        symbolsToFetch.push(p.ticker);
      } else if (p.ticker && p.expirationDate && p.strikePrice) {
        const datePart = formatYahooDate(p.expirationDate);
        const typePart = p.type === 'CALL' ? 'C' : 'P';
        const strikePart = formatYahooStrike(Number(p.strikePrice));
        const sym = `${p.ticker.toUpperCase()}${datePart}${typePart}${strikePart}`;
        p.realSymbol = sym;
        symbolsToFetch.push(sym);
      }
    });

    const uniqueSymbols = Array.from(new Set(symbolsToFetch));
    const quotes: Record<string, number> = {};
    
    console.log(`[Vault] Fetching prices for: ${uniqueSymbols.join(', ')}`);

    for (const sym of uniqueSymbols) {
      try {
        const q = await yf.quote(sym);
        quotes[sym] = q.regularMarketPrice || 0;
      } catch (e: any) {
        console.warn(`[Vault] Failed to fetch ${sym}:`, e.message);
        quotes[sym] = 0;
      }
    }

    const enriched = portfolio.map((p: any) => {
      const lookupSymbol = p.type === 'SHARE' ? p.ticker : p.realSymbol;
      const currentPrice = quotes[lookupSymbol] || 0;
      
      const multiplier = p.type === 'SHARE' ? 1 : 100;
      
      const marketValue = currentPrice * p.shares * multiplier;
      const costBasis = p.entryPrice * p.shares * multiplier;
      
      const gain = marketValue - costBasis;
      const gainPercent = costBasis > 0 ? (gain / costBasis) * 100 : 0;

      return { 
        ...p, 
        currentPrice, 
        marketValue, 
        gain, 
        gainPercent,
        displaySymbol: lookupSymbol
      };
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

  try {
    await query(
      `INSERT INTO portfolio (id, ticker, type, "entryPrice", shares, "dateOpened", status, "strikePrice", "expirationDate")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, ticker.toUpperCase(), type, price, shares, dateOpened, 'OPEN', strike || null, expiry || null]
    );
    res.json({ success: true, msg: "Asset Secured" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to save trade" });
  }
});

router.put('/edit', async (req, res) => {
  const { id, ticker, price, type, shares, strike, expiry } = req.body;
  try {
    await query(
      `UPDATE portfolio 
       SET ticker = $1, type = $2, "entryPrice" = $3, shares = $4, "strikePrice" = $5, "expirationDate" = $6
       WHERE id = $7`,
      [ticker.toUpperCase(), type, price, shares, strike || null, expiry || null, id]
    );
    res.json({ success: true, msg: "Position Updated" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to update trade" });
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

router.post('/optimize', requirePremium, async (req, res) => {
  try {
    const result = await query('SELECT * FROM portfolio WHERE status = $1', ['OPEN']);
    const portfolio = result.rows;

    if (portfolio.length === 0) return res.json({ success: false, error: "Portfolio is empty." });

    const holdings = portfolio.map((p: any) => {
      if (p.type === 'SHARE') return `Stock: ${p.ticker}`;
      return `Option: ${p.ticker} ${p.type} $${p.strikePrice} Strike, Exp: ${p.expirationDate}`;
    }).join('\n');

    const prompt = `
      Analyze this portfolio:
      ${holdings}
      
      Output JSON:
      {
        "diversityScore": "1-100",
        "analysis": "Risk summary.",
        "optionsStrategy": "Critique on options expiration/greeks.",
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

  } catch (error) {
    res.status(500).json({ success: false, error: "Optimization Failed" });
  }
});

export default router;

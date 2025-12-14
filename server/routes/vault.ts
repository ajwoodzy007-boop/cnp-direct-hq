import express from 'express';
import YahooFinanceDefault from 'yahoo-finance2';
import OpenAI from 'openai';
import { query } from '../db';
import { requirePremium } from '../middleware/premium';

// Handle both ESM (dev) and CJS (production) module formats
const YahooFinance = (YahooFinanceDefault as any).default || YahooFinanceDefault;
const yf = typeof YahooFinance === 'function' ? new YahooFinance() : YahooFinance;
const router = express.Router();
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

function getUserIdFromSession(req: express.Request): string | null {
  const user = (req.session as any)?.user;
  return user?.id || null;
}

router.get('/', async (req, res) => {
  try {
    const userId = getUserIdFromSession(req);
    
    if (!userId) {
      return res.json({ success: true, data: [] });
    }
    
    const result = await query(
      'SELECT * FROM portfolio WHERE status = $1 AND user_id = $2', 
      ['OPEN', userId]
    );
    const portfolio = result.rows;
    
    const symbolsToFetch: string[] = [];
    
    portfolio.forEach((p: any) => {
      if (p.type === 'SHARE') {
        symbolsToFetch.push(p.ticker);
      } else if (p.type === 'CRYPTO') {
        let cryptoSymbol = p.ticker.toUpperCase().replace(/[-_]?USD$/i, '');
        cryptoSymbol = `${cryptoSymbol}-USD`;
        p.realSymbol = cryptoSymbol;
        symbolsToFetch.push(cryptoSymbol);
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
    
    console.log(`[Vault] User ${userId} - Fetching prices for: ${uniqueSymbols.join(', ')}`);

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
      
      const multiplier = (p.type === 'SHARE' || p.type === 'CRYPTO') ? 1 : 100;
      
      const shares = parseFloat(p.shares) || 0;
      const entryPrice = parseFloat(p.entryPrice) || 0;
      
      const marketValue = currentPrice * shares * multiplier;
      const costBasis = entryPrice * shares * multiplier;
      
      const gain = marketValue - costBasis;
      const gainPercent = costBasis > 0 ? (gain / costBasis) * 100 : 0;

      return { 
        ...p,
        shares,
        entryPrice, 
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
  const userId = getUserIdFromSession(req);
  
  if (!userId) {
    return res.status(401).json({ success: false, error: "Authentication required" });
  }
  
  const { ticker, price, type, shares, strike, expiry } = req.body;
  const id = Math.random().toString(36).substr(2, 9);
  const dateOpened = new Date().toISOString().split('T')[0];

  try {
    await query(
      `INSERT INTO portfolio (id, ticker, type, "entryPrice", shares, "dateOpened", status, "strikePrice", "expirationDate", user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, ticker.toUpperCase(), type, price, shares, dateOpened, 'OPEN', strike || null, expiry || null, userId]
    );
    res.json({ success: true, msg: "Asset Secured" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to save trade" });
  }
});

router.put('/edit', async (req, res) => {
  const userId = getUserIdFromSession(req);
  
  if (!userId) {
    return res.status(401).json({ success: false, error: "Authentication required" });
  }
  
  const { id, ticker, price, type, shares, strike, expiry } = req.body;
  try {
    await query(
      `UPDATE portfolio 
       SET ticker = $1, type = $2, "entryPrice" = $3, shares = $4, "strikePrice" = $5, "expirationDate" = $6
       WHERE id = $7 AND user_id = $8`,
      [ticker.toUpperCase(), type, price, shares, strike || null, expiry || null, id, userId]
    );
    res.json({ success: true, msg: "Position Updated" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to update trade" });
  }
});

router.post('/close', async (req, res) => {
  const userId = getUserIdFromSession(req);
  
  if (!userId) {
    return res.status(401).json({ success: false, error: "Authentication required" });
  }
  
  const { id } = req.body;
  try {
    await query('DELETE FROM portfolio WHERE id = $1 AND user_id = $2', [id, userId]);
    res.json({ success: true, msg: "Position Closed" });
  } catch (e) {
    res.status(500).json({ success: false, error: "Could not close trade" });
  }
});

router.post('/optimize', requirePremium, async (req, res) => {
  const userId = getUserIdFromSession(req);
  
  if (!userId) {
    return res.status(401).json({ success: false, error: "Authentication required" });
  }
  
  try {
    const result = await query(
      'SELECT * FROM portfolio WHERE status = $1 AND user_id = $2', 
      ['OPEN', userId]
    );
    const portfolio = result.rows;

    if (portfolio.length === 0) return res.json({ success: false, error: "Portfolio is empty." });

    const holdings = portfolio.map((p: any) => {
      if (p.type === 'SHARE') return `Stock: ${p.ticker}`;
      if (p.type === 'CRYPTO') return `Crypto: ${p.ticker} (${p.shares} units)`;
      return `Option: ${p.ticker} ${p.type} $${p.strikePrice} Strike, Exp: ${p.expirationDate}`;
    }).join('\n');

    const prompt = `
      Analyze this portfolio:
      ${holdings}
      
      Output JSON:
      {
        "diversityScore": "1-100",
        "analysis": "Risk summary including crypto volatility if applicable.",
        "optionsStrategy": "Critique on options expiration/greeks if applicable.",
        "cryptoAnalysis": "Crypto allocation and volatility assessment if portfolio contains crypto.",
        "suggestions": ["Specific actions for stocks, options, and crypto"]
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

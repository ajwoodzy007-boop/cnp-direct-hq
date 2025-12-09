import type { Express } from "express";
import { createServer, type Server } from "http";
import { scanMarket, getChartData, getNews } from "./lib/marketData";
import { storage } from "./storage";
import { insertPredictionSchema, insertWatchlistSchema } from "@shared/schema";
import OpenAI from "openai";
import { z } from "zod";
import { stripeService } from "./stripeService";
import { getStripePublishableKey } from "./stripeClient";

const aiPlaybookResponseSchema = z.object({
  summary: z.string().default("Unable to generate summary"),
  insights: z.array(z.string()).default([]),
  recommendation: z.string().default("Keep tracking your trades for more insights"),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // GET /api/market/scan - Scan market for gainers/losers
  app.get("/api/market/scan", async (req, res) => {
    try {
      const data = await scanMarket();
      res.json({ success: true, data: Array.isArray(data) ? data : [], timestamp: new Date().toISOString() });
    } catch (error) {
      console.error("Market scan error:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to scan market data",
        data: []
      });
    }
  });

  // GET /api/market/chart/:ticker - Get chart data for a ticker
  app.get("/api/market/chart/:ticker", async (req, res) => {
    try {
      const { ticker } = req.params;
      const period = (req.query.period as "1d" | "1w" | "1m" | "3m") || "3m";
      
      const data = await getChartData(ticker.toUpperCase(), period);
      res.json({ success: true, ticker, period, data: Array.isArray(data) ? data : [] });
    } catch (error) {
      console.error("Chart data error:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to fetch chart data",
        data: []
      });
    }
  });

  // GET /api/market/news/:ticker - Get news for a ticker
  app.get("/api/market/news/:ticker", async (req, res) => {
    try {
      const { ticker } = req.params;
      const data = await getNews(ticker.toUpperCase());
      res.json({ success: true, ticker, data: Array.isArray(data) ? data : [] });
    } catch (error) {
      console.error("News data error:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to fetch news data",
        data: []
      });
    }
  });

  // GET /api/predictions - Get all predictions
  app.get("/api/predictions", async (req, res) => {
    try {
      const data = await storage.getPredictions();
      res.json({ success: true, data });
    } catch (error) {
      console.error("Get predictions error:", error);
      res.status(500).json({ success: false, error: "Failed to get predictions", data: [] });
    }
  });

  // POST /api/predictions - Create a new prediction
  app.post("/api/predictions", async (req, res) => {
    try {
      const parsed = insertPredictionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.message });
      }
      const prediction = await storage.createPrediction(parsed.data);
      res.json({ success: true, data: prediction });
    } catch (error) {
      console.error("Create prediction error:", error);
      res.status(500).json({ success: false, error: "Failed to create prediction" });
    }
  });

  // PATCH /api/predictions/:id/outcome - Update prediction outcome
  app.patch("/api/predictions/:id/outcome", async (req, res) => {
    try {
      const { id } = req.params;
      const { outcome, outcomePrice } = req.body;
      if (!outcome || outcomePrice === undefined) {
        return res.status(400).json({ success: false, error: "Missing outcome or outcomePrice" });
      }
      const updated = await storage.updatePredictionOutcome(id, outcome, outcomePrice);
      if (!updated) {
        return res.status(404).json({ success: false, error: "Prediction not found" });
      }
      res.json({ success: true, data: updated });
    } catch (error) {
      console.error("Update prediction error:", error);
      res.status(500).json({ success: false, error: "Failed to update prediction" });
    }
  });

  // GET /api/watchlist - Get all watchlist items
  app.get("/api/watchlist", async (req, res) => {
    try {
      const data = await storage.getWatchlist();
      res.json({ success: true, data });
    } catch (error) {
      console.error("Get watchlist error:", error);
      res.status(500).json({ success: false, error: "Failed to get watchlist", data: [] });
    }
  });

  // POST /api/watchlist - Add to watchlist
  app.post("/api/watchlist", async (req, res) => {
    try {
      const parsed = insertWatchlistSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.message });
      }
      const item = await storage.addToWatchlist(parsed.data);
      res.json({ success: true, data: item });
    } catch (error) {
      console.error("Add to watchlist error:", error);
      res.status(500).json({ success: false, error: "Failed to add to watchlist" });
    }
  });

  // DELETE /api/watchlist/:ticker - Remove from watchlist
  app.delete("/api/watchlist/:ticker", async (req, res) => {
    try {
      const { ticker } = req.params;
      const removed = await storage.removeFromWatchlist(ticker);
      if (!removed) {
        return res.status(404).json({ success: false, error: "Ticker not in watchlist" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Remove from watchlist error:", error);
      res.status(500).json({ success: false, error: "Failed to remove from watchlist" });
    }
  });

  // POST /api/ai/playbook - Generate AI trading insights
  app.post("/api/ai/playbook", async (req, res) => {
    try {
      const allPredictions = await storage.getPredictions();
      const predictions = [...allPredictions].sort(
        (a, b) => new Date(b.predictionDate).getTime() - new Date(a.predictionDate).getTime()
      );
      const { marketSummary } = req.body;
      
      if (predictions.length === 0) {
        return res.json({
          success: true,
          data: {
            summary: "Start making predictions to unlock AI insights! Add stocks to your predictions and record outcomes to get personalized trading analysis.",
            insights: [],
            recommendation: "Focus on high-volume stocks with bullish sentiment (Rocket Ships) for your first trades."
          }
        });
      }

      const completed = predictions.filter(p => p.outcome);
      const wins = completed.filter(p => p.outcome === "win").length;
      const losses = completed.filter(p => p.outcome === "loss").length;
      const winRate = completed.length > 0 ? (wins / completed.length * 100).toFixed(1) : "0";
      
      const signalTypes = predictions.reduce((acc, p) => {
        acc[p.signalType] = (acc[p.signalType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const signalPerformance = Object.keys(signalTypes).map(signal => {
        const signalPreds = completed.filter(p => p.signalType === signal);
        const signalWins = signalPreds.filter(p => p.outcome === "win").length;
        return {
          signal,
          count: signalTypes[signal],
          winRate: signalPreds.length > 0 ? (signalWins / signalPreds.length * 100).toFixed(1) : "N/A"
        };
      });

      const prompt = `You are a trading coach analyzing a trader's performance. Be concise and actionable.

TRADER STATS:
- Total predictions: ${predictions.length}
- Completed trades: ${completed.length}
- Win rate: ${winRate}%
- Wins: ${wins}, Losses: ${losses}

SIGNAL TYPE BREAKDOWN:
${signalPerformance.map(s => `- ${s.signal}: ${s.count} trades, ${s.winRate}% win rate`).join('\n')}

RECENT PREDICTIONS (last 5):
${predictions.slice(0, 5).map(p => `- ${p.ticker} (${p.signalType}): Entry $${p.entryPrice.toFixed(2)} → ${p.outcome || 'Pending'}`).join('\n')}

${marketSummary ? `CURRENT MARKET: ${marketSummary}` : ''}

Provide a JSON response with exactly this structure:
{
  "summary": "1-2 sentence overall assessment of their trading",
  "insights": ["insight 1", "insight 2", "insight 3"],
  "recommendation": "One specific actionable tip for improvement"
}`;

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from AI");
      }

      let rawParsed: unknown;
      try {
        rawParsed = JSON.parse(content);
      } catch {
        rawParsed = {};
      }
      
      const validated = aiPlaybookResponseSchema.safeParse(rawParsed);
      const data = validated.success ? validated.data : {
        summary: "Unable to parse AI response. Please try again.",
        insights: [],
        recommendation: "Keep tracking your trades for more insights.",
      };
      
      res.json({ success: true, data });
    } catch (error) {
      console.error("AI playbook error:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to generate AI insights",
        data: {
          summary: "Unable to generate insights right now. Please try again later.",
          insights: [],
          recommendation: "Keep tracking your trades to build up data for analysis."
        }
      });
    }
  });

  // GET /api/stripe/config - Get Stripe publishable key
  app.get("/api/stripe/config", async (req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ success: true, publishableKey });
    } catch (error) {
      console.error("Stripe config error:", error);
      res.status(500).json({ success: false, error: "Failed to get Stripe config" });
    }
  });

  // GET /api/stripe/products - Get all subscription products with prices
  app.get("/api/stripe/products", async (req, res) => {
    try {
      const rows = await storage.getStripeProductsWithPrices();
      
      const productsMap = new Map();
      for (const row of rows) {
        if (!productsMap.has(row.product_id)) {
          productsMap.set(row.product_id, {
            id: row.product_id,
            name: row.product_name,
            description: row.product_description,
            active: row.product_active,
            metadata: row.product_metadata,
            prices: []
          });
        }
        if (row.price_id) {
          productsMap.get(row.product_id).prices.push({
            id: row.price_id,
            unit_amount: row.unit_amount,
            currency: row.currency,
            recurring: row.recurring,
            active: row.price_active,
          });
        }
      }

      res.json({ success: true, data: Array.from(productsMap.values()) });
    } catch (error) {
      console.error("Get products error:", error);
      res.status(500).json({ success: false, error: "Failed to get products", data: [] });
    }
  });

  // POST /api/stripe/checkout - Create checkout session
  app.post("/api/stripe/checkout", async (req, res) => {
    try {
      const { priceId, email } = req.body;
      if (!priceId) {
        return res.status(400).json({ success: false, error: "Missing priceId" });
      }

      const customer = await stripeService.createCustomer(email || "customer@example.com", {
        source: "pro-trader-dashboard"
      });

      const baseUrl = `https://${req.get('host')}`;
      const session = await stripeService.createCheckoutSession(
        customer.id,
        priceId,
        `${baseUrl}/checkout/success`,
        `${baseUrl}/checkout/cancel`
      );

      res.json({ success: true, url: session.url });
    } catch (error) {
      console.error("Checkout error:", error);
      res.status(500).json({ success: false, error: "Failed to create checkout session" });
    }
  });

  // POST /api/stripe/portal - Create customer portal session
  app.post("/api/stripe/portal", async (req, res) => {
    try {
      const { customerId } = req.body;
      if (!customerId) {
        return res.status(400).json({ success: false, error: "Missing customerId" });
      }

      const baseUrl = `https://${req.get('host')}`;
      const session = await stripeService.createCustomerPortalSession(
        customerId,
        `${baseUrl}/`
      );

      res.json({ success: true, url: session.url });
    } catch (error) {
      console.error("Portal error:", error);
      res.status(500).json({ success: false, error: "Failed to create portal session" });
    }
  });

  // GET /api/go/:ticker - Affiliate redirect with click tracking
  // Configure AFFILIATE_URL in environment to use your affiliate link
  // Example eToro format: https://www.etoro.com/markets/{ticker}?affiliates=YOUR_AFFILIATE_ID
  // Default: Yahoo Finance for research
  app.get("/api/go/:ticker", async (req, res) => {
    try {
      const { ticker } = req.params;
      const tickerUpper = ticker.toUpperCase();
      
      // Build destination URL - use affiliate link if configured, otherwise Yahoo Finance
      const affiliateBase = process.env.AFFILIATE_URL;
      let destination: string;
      
      if (affiliateBase) {
        // Replace {ticker} placeholder with actual ticker symbol
        destination = affiliateBase.replace('{ticker}', tickerUpper);
      } else {
        // Default to Yahoo Finance for stock research
        destination = `https://finance.yahoo.com/quote/${tickerUpper}`;
      }
      
      await storage.logAffiliateClick({
        ticker: tickerUpper,
        destination,
        referrer: req.get('referer') || null,
        userAgent: req.get('user-agent') || null,
      });
      
      res.redirect(destination);
    } catch (error) {
      console.error("Affiliate redirect error:", error);
      // Still redirect even if logging fails
      const tickerUpper = req.params.ticker.toUpperCase();
      const fallback = process.env.AFFILIATE_URL?.replace('{ticker}', tickerUpper) 
        || `https://finance.yahoo.com/quote/${tickerUpper}`;
      res.redirect(fallback);
    }
  });

  // GET /api/affiliate/stats - Get click statistics
  app.get("/api/affiliate/stats", async (req, res) => {
    try {
      const stats = await storage.getAffiliateClickStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error("Affiliate stats error:", error);
      res.status(500).json({ success: false, error: "Failed to get affiliate stats", data: [] });
    }
  });

  // GET /api/predictions/performance - Get predictions with performance data
  app.get("/api/predictions/performance", async (req, res) => {
    try {
      const data = await storage.getPredictionsWithPerformance();
      res.json({ success: true, data });
    } catch (error) {
      console.error("Get predictions performance error:", error);
      res.status(500).json({ success: false, error: "Failed to get predictions performance", data: [] });
    }
  });

  // GET /api/market/recommendations - Get weekly top 5 buy/sell recommendations
  // Uses historical chart data to calculate accurate RSI and trend analysis
  app.get("/api/market/recommendations", async (req, res) => {
    try {
      const marketData = await scanMarket();
      
      // Calculate RSI from historical chart data for more accurate recommendations
      const calculateRSI = (prices: number[], period: number = 14): number => {
        if (prices.length < period + 1) return 50;
        let gains = 0;
        let losses = 0;
        for (let i = prices.length - period; i < prices.length; i++) {
          const change = prices[i] - prices[i - 1];
          if (change > 0) gains += change;
          else losses -= change;
        }
        const avgGain = gains / period;
        const avgLoss = losses / period;
        if (avgLoss === 0) return 100;
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
      };

      // Calculate price trend from chart data
      const calculateTrend = (prices: number[]): { trend: "up" | "down" | "sideways"; strength: number } => {
        if (prices.length < 5) return { trend: "sideways", strength: 0 };
        const recent = prices.slice(-5);
        const older = prices.slice(-20, -5);
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : recentAvg;
        const change = ((recentAvg - olderAvg) / olderAvg) * 100;
        if (change > 3) return { trend: "up", strength: Math.min(change, 10) };
        if (change < -3) return { trend: "down", strength: Math.min(Math.abs(change), 10) };
        return { trend: "sideways", strength: Math.abs(change) };
      };

      const buyPicks: Array<{ ticker: string; price: number; signal: string; reasoning: string; score: number }> = [];
      const sellPicks: Array<{ ticker: string; price: number; signal: string; reasoning: string; score: number }> = [];
      
      // Analyze each stock using historical chart data
      for (const stock of marketData) {
        try {
          const chartData = await getChartData(stock.ticker, "1m");
          const prices = chartData.map(d => d.close);
          
          if (prices.length >= 15) {
            const rsi = calculateRSI(prices);
            const { trend, strength } = calculateTrend(prices);
            const priceChange = prices.length >= 2 
              ? ((prices[prices.length - 1] - prices[prices.length - 2]) / prices[prices.length - 2]) * 100 
              : 0;
            
            // BUY: RSI < 40 (oversold) with upward trend or neutral
            if (rsi < 40 && trend !== "down") {
              const score = (40 - rsi) + strength + (stock.sentiment === "🟢 BULLISH" ? 15 : 0) + (stock.rvol > 1.5 ? 5 : 0);
              buyPicks.push({
                ticker: stock.ticker,
                price: stock.price,
                signal: "BUY",
                reasoning: `RSI ${rsi.toFixed(0)} (oversold), ${trend === "up" ? "uptrend" : "consolidating"}${stock.sentiment === "🟢 BULLISH" ? ", bullish news" : ""}`,
                score
              });
            }
            // Also consider stocks with strong uptrend and bullish sentiment
            else if (trend === "up" && strength > 5 && stock.sentiment === "🟢 BULLISH" && rsi < 65) {
              const score = strength + 10 + (stock.rvol > 2 ? 10 : 0);
              buyPicks.push({
                ticker: stock.ticker,
                price: stock.price,
                signal: "BUY",
                reasoning: `Strong uptrend (+${strength.toFixed(1)}%), bullish sentiment, RSI ${rsi.toFixed(0)}`,
                score
              });
            }
            
            // SELL: RSI > 70 (overbought) or downtrend with bearish sentiment
            if (rsi > 70) {
              const score = (rsi - 70) + (stock.sentiment === "🔴 BEARISH" ? 15 : 0) + (trend === "down" ? strength : 0);
              sellPicks.push({
                ticker: stock.ticker,
                price: stock.price,
                signal: "SELL",
                reasoning: `RSI ${rsi.toFixed(0)} (overbought)${stock.sentiment === "🔴 BEARISH" ? ", bearish news" : ""}${trend === "down" ? ", downtrend" : ""}`,
                score
              });
            }
            else if (trend === "down" && strength > 5 && stock.sentiment === "🔴 BEARISH") {
              const score = strength + 10;
              sellPicks.push({
                ticker: stock.ticker,
                price: stock.price,
                signal: "SELL",
                reasoning: `Downtrend (-${strength.toFixed(1)}%), bearish sentiment, RSI ${rsi.toFixed(0)}`,
                score
              });
            }
          }
        } catch (error) {
          // Skip stocks that fail chart data fetch
          console.error(`Chart analysis failed for ${stock.ticker}:`, error);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Sort by score and take top 5
      const topBuys = buyPicks.sort((a, b) => b.score - a.score).slice(0, 5);
      const topSells = sellPicks.sort((a, b) => b.score - a.score).slice(0, 5);
      
      res.json({ 
        success: true, 
        data: {
          buys: topBuys.map(({ ticker, price, signal, reasoning }) => ({ ticker, price, signal, reasoning })),
          sells: topSells.map(({ ticker, price, signal, reasoning }) => ({ ticker, price, signal, reasoning })),
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Get recommendations error:", error);
      res.status(500).json({ success: false, error: "Failed to get recommendations", data: { buys: [], sells: [] } });
    }
  });

  // Training affiliate redirects - Configure these environment variables with your affiliate IDs:
  // AFFILIATE_WARRIOR_TRADING - Warrior Trading affiliate ID
  // AFFILIATE_TRADINGVIEW - TradingView affiliate ID  
  // AFFILIATE_TRADE_IDEAS - Trade Ideas affiliate ID
  // AFFILIATE_SIMPLER_TRADING - Simpler Trading affiliate ID
  
  app.get("/api/affiliate/training/:partner", async (req, res) => {
    const { partner } = req.params;
    
    const affiliateLinks: Record<string, { base: string; paramName: string; envVar: string }> = {
      warrior: { 
        base: "https://www.warriortrading.com/", 
        paramName: "ref", 
        envVar: "AFFILIATE_WARRIOR_TRADING" 
      },
      tradingview: { 
        base: "https://www.tradingview.com/", 
        paramName: "aff_id", 
        envVar: "AFFILIATE_TRADINGVIEW" 
      },
      tradeideas: { 
        base: "https://www.trade-ideas.com/", 
        paramName: "ref", 
        envVar: "AFFILIATE_TRADE_IDEAS" 
      },
      simpler: { 
        base: "https://www.simplertrading.com/", 
        paramName: "ref", 
        envVar: "AFFILIATE_SIMPLER_TRADING" 
      },
    };
    
    const config = affiliateLinks[partner.toLowerCase()];
    if (!config) {
      return res.status(404).json({ success: false, error: "Unknown partner" });
    }
    
    const affiliateId = process.env[config.envVar];
    const destination = affiliateId 
      ? `${config.base}?${config.paramName}=${affiliateId}`
      : config.base;
    
    try {
      await storage.logAffiliateClick({
        ticker: `TRAINING:${partner.toUpperCase()}`,
        destination,
        referrer: req.get('referer') || null,
        userAgent: req.get('user-agent') || null,
      });
    } catch (error) {
      console.error("Failed to log training affiliate click:", error);
    }
    
    res.redirect(destination);
  });

  return httpServer;
}

import OpenAI from "openai";
import { storage } from "../storage";
import { scanMarket, getNews } from "./marketData";

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

async function getQuote(ticker: string): Promise<any> {
  if (!FINNHUB_API_KEY) return {};
  try {
    const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_API_KEY}`);
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

// Use OPENAI_API_KEY first, fall back to integration key only if it's not a dummy
const getOpenAIKey = () => {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  const integrationKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (integrationKey && !integrationKey.includes("DUMMY")) return integrationKey;
  return process.env.OPENAI_API_KEY || "";
};

const openai = new OpenAI({
  apiKey: getOpenAIKey(),
});

interface PlaybookResult {
  success: boolean;
  runId?: string;
  sections: {
    sectionType: string;
    title: string;
    content: string;
    metadata?: any;
    priority?: string;
  }[];
  error?: string;
}

export async function generateTradingStrategies(
  userId: string,
  tradingStyle: string = "swing",
  riskTolerance: string = "moderate",
  experienceLevel: string = "intermediate"
): Promise<PlaybookResult> {
  try {
    const run = await storage.createPlaybookRun({
      userId,
      playbookType: "strategy",
      status: "generating",
      inputData: { tradingStyle, riskTolerance, experienceLevel },
    });

    const prompt = `You are an expert trading strategist. Generate a personalized trading playbook for a ${experienceLevel} trader with ${riskTolerance} risk tolerance who prefers ${tradingStyle} trading.

Include:
1. **Primary Strategy** - A detailed main strategy with entry/exit rules
2. **Risk Management Rules** - Position sizing, stop-loss placement, max drawdown limits
3. **Trade Setup Checklist** - Specific criteria that must be met before entering trades
4. **Market Conditions** - When to be aggressive vs defensive
5. **Weekly Routine** - Suggested schedule for analysis and trading

Format each section with clear, actionable bullet points. Be specific with numbers and percentages.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = response.choices[0].message.content || "";
    
    const sections = [
      {
        sectionType: "strategy",
        title: `Personalized ${tradingStyle.charAt(0).toUpperCase() + tradingStyle.slice(1)} Trading Playbook`,
        content,
        metadata: { tradingStyle, riskTolerance, experienceLevel },
        priority: "high",
      },
    ];

    await storage.savePlaybookSections(
      sections.map((s) => ({ ...s, runId: run.id }))
    );
    await storage.updatePlaybookRunStatus(run.id, "completed");

    return { success: true, runId: run.id, sections };
  } catch (error: any) {
    return { success: false, sections: [], error: error.message };
  }
}

export async function generateMarketBriefing(userId: string): Promise<PlaybookResult> {
  try {
    const run = await storage.createPlaybookRun({
      userId,
      playbookType: "briefing",
      status: "generating",
    });

    const marketData = await scanMarket();
    const sorted = [...marketData].sort((a, b) => b.changePercent - a.changePercent);
    const gainers = sorted.filter(s => s.changePercent > 0).slice(0, 5);
    const losers = sorted.filter(s => s.changePercent < 0).slice(-5).reverse();

    const prompt = `You are a financial market analyst. Generate a concise daily market briefing based on today's market movers.

Top Gainers:
${gainers.map((g: any) => `${g.ticker}: +${g.changePercent.toFixed(2)}% ($${g.price.toFixed(2)})`).join("\n")}

Top Losers:
${losers.map((l: any) => `${l.ticker}: ${l.changePercent.toFixed(2)}% ($${l.price.toFixed(2)})`).join("\n")}

Provide:
1. **Market Overview** - Overall market sentiment and key themes today
2. **Sector Analysis** - Which sectors are showing strength/weakness
3. **Key Observations** - Notable patterns or unusual activity
4. **Trading Opportunities** - Potential setups to watch
5. **Risk Factors** - What could impact markets in coming sessions

Keep it professional, data-driven, and actionable.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const content = response.choices[0].message.content || "";

    const sections = [
      {
        sectionType: "briefing",
        title: `Daily Market Briefing - ${new Date().toLocaleDateString()}`,
        content,
        metadata: { gainers: gainers.map((g: any) => g.ticker), losers: losers.map((l: any) => l.ticker) },
        priority: "high",
      },
    ];

    await storage.savePlaybookSections(
      sections.map((s) => ({ ...s, runId: run.id }))
    );
    await storage.updatePlaybookRunStatus(run.id, "completed");

    return { success: true, runId: run.id, sections };
  } catch (error: any) {
    return { success: false, sections: [], error: error.message };
  }
}

export async function generateEntryExitSignals(
  userId: string,
  tickers: string[]
): Promise<PlaybookResult> {
  try {
    const run = await storage.createPlaybookRun({
      userId,
      playbookType: "signals",
      status: "generating",
      inputData: { tickers },
    });

    const quotes = await Promise.all(
      tickers.slice(0, 5).map(async (ticker) => {
        const quote = await getQuote(ticker);
        return { ticker, ...quote };
      })
    );

    const prompt = `You are a technical analyst. Analyze these stocks and provide specific entry/exit signals.

Stocks:
${quotes.map((q: any) => `${q.ticker}: $${q.c?.toFixed(2) || "N/A"} (Change: ${q.dp?.toFixed(2) || "N/A"}%)`).join("\n")}

For each stock, provide:
1. **Signal Type** - BUY, SELL, or HOLD with confidence level (1-10)
2. **Entry Price** - Specific price level for entry
3. **Stop Loss** - Where to place protective stop
4. **Target 1** - First profit target
5. **Target 2** - Extended profit target
6. **Reasoning** - Brief technical justification

Format as structured recommendations with clear numbers.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const content = response.choices[0].message.content || "";

    const sections = [
      {
        sectionType: "signals",
        title: "Smart Entry/Exit Signals",
        content,
        metadata: { tickers, quotes },
        priority: "high",
      },
    ];

    await storage.savePlaybookSections(
      sections.map((s) => ({ ...s, runId: run.id }))
    );
    await storage.updatePlaybookRunStatus(run.id, "completed");

    return { success: true, runId: run.id, sections };
  } catch (error: any) {
    return { success: false, sections: [], error: error.message };
  }
}

export async function generateRiskAssessment(
  userId: string,
  ticker: string
): Promise<PlaybookResult> {
  try {
    const run = await storage.createPlaybookRun({
      userId,
      playbookType: "risk",
      status: "generating",
      inputData: { ticker },
    });

    const quote = await getQuote(ticker);
    const news = await getNews(ticker);

    const prompt = `You are a risk analyst. Provide a comprehensive risk assessment for ${ticker}.

Current Data:
- Price: $${quote.c?.toFixed(2) || "N/A"}
- Change: ${quote.dp?.toFixed(2) || "N/A"}%
- High: $${quote.h?.toFixed(2) || "N/A"}
- Low: $${quote.l?.toFixed(2) || "N/A"}

Recent News Headlines:
${news.slice(0, 3).map((n: any) => `- ${n.title}`).join("\n")}

Provide:
1. **Overall Risk Score** - 1-10 (1=lowest risk, 10=highest risk)
2. **Reward/Risk Ratio** - Expected potential reward vs risk
3. **Key Risk Factors** - What could go wrong
4. **Catalyst Watch** - Upcoming events that could impact price
5. **Position Size Recommendation** - Based on risk level
6. **Risk Mitigation** - How to protect against downside

Be specific and data-driven in your assessment.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1200,
    });

    const content = response.choices[0].message.content || "";

    const sections = [
      {
        sectionType: "risk",
        title: `Risk Assessment: ${ticker}`,
        content,
        metadata: { ticker, quote, newsCount: news.length },
        priority: "high",
      },
    ];

    await storage.savePlaybookSections(
      sections.map((s) => ({ ...s, runId: run.id }))
    );
    await storage.updatePlaybookRunStatus(run.id, "completed");

    return { success: true, runId: run.id, sections };
  } catch (error: any) {
    return { success: false, sections: [], error: error.message };
  }
}

export async function generatePortfolioOptimization(
  userId: string,
  holdings: { ticker: string; shares: number; avgCost: number }[]
): Promise<PlaybookResult> {
  try {
    const run = await storage.createPlaybookRun({
      userId,
      playbookType: "portfolio",
      status: "generating",
      inputData: { holdings },
    });

    const quotes = await Promise.all(
      holdings.map(async (h) => {
        const quote = await getQuote(h.ticker);
        return {
          ...h,
          currentPrice: quote.c || h.avgCost,
          change: quote.dp || 0,
        };
      })
    );

    const totalValue = quotes.reduce(
      (sum, h) => sum + h.shares * h.currentPrice,
      0
    );

    const prompt = `You are a portfolio manager. Optimize this portfolio allocation.

Current Holdings:
${quotes.map((h) => `${h.ticker}: ${h.shares} shares @ $${h.avgCost.toFixed(2)} avg (Current: $${h.currentPrice.toFixed(2)}, ${h.change >= 0 ? "+" : ""}${h.change.toFixed(2)}%)`).join("\n")}

Total Portfolio Value: $${totalValue.toFixed(2)}

Provide:
1. **Portfolio Health Score** - 1-100 rating
2. **Diversification Analysis** - Sector exposure and concentration risks
3. **Rebalancing Recommendations** - What to trim/add
4. **Correlation Concerns** - Highly correlated holdings
5. **Suggested Additions** - New positions to consider for diversification
6. **Action Priority List** - Ranked actions to take

Be specific with percentages and allocation targets.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const content = response.choices[0].message.content || "";

    const sections = [
      {
        sectionType: "portfolio",
        title: "Portfolio Optimization Report",
        content,
        metadata: { holdings: quotes, totalValue },
        priority: "high",
      },
    ];

    await storage.savePlaybookSections(
      sections.map((s) => ({ ...s, runId: run.id }))
    );
    await storage.updatePlaybookRunStatus(run.id, "completed");

    return { success: true, runId: run.id, sections };
  } catch (error: any) {
    return { success: false, sections: [], error: error.message };
  }
}

export async function generatePatternRecognition(
  userId: string,
  ticker: string
): Promise<PlaybookResult> {
  try {
    const run = await storage.createPlaybookRun({
      userId,
      playbookType: "patterns",
      status: "generating",
      inputData: { ticker },
    });

    const quote = await getQuote(ticker);

    const prompt = `You are a technical chart pattern expert. Analyze ${ticker} for chart patterns.

Current Data:
- Price: $${quote.c?.toFixed(2) || "N/A"}
- Open: $${quote.o?.toFixed(2) || "N/A"}
- High: $${quote.h?.toFixed(2) || "N/A"}
- Low: $${quote.l?.toFixed(2) || "N/A"}
- Previous Close: $${quote.pc?.toFixed(2) || "N/A"}
- Change: ${quote.dp?.toFixed(2) || "N/A"}%

Identify and explain:
1. **Candlestick Patterns** - Any significant single or multi-day patterns
2. **Chart Formations** - Head & shoulders, triangles, flags, wedges, etc.
3. **Support/Resistance Levels** - Key price levels to watch
4. **Trend Analysis** - Current trend direction and strength
5. **Pattern Implications** - What these patterns suggest for future price action
6. **Trade Setup** - If patterns indicate a trade, provide entry/stop/target

Explain patterns in educational terms so traders can learn to spot them.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const content = response.choices[0].message.content || "";

    const sections = [
      {
        sectionType: "patterns",
        title: `Pattern Analysis: ${ticker}`,
        content,
        metadata: { ticker, quote },
        priority: "high",
      },
    ];

    await storage.savePlaybookSections(
      sections.map((s) => ({ ...s, runId: run.id }))
    );
    await storage.updatePlaybookRunStatus(run.id, "completed");

    return { success: true, runId: run.id, sections };
  } catch (error: any) {
    return { success: false, sections: [], error: error.message };
  }
}

export async function generateEarningsAnalysis(
  userId: string,
  ticker: string
): Promise<PlaybookResult> {
  try {
    const run = await storage.createPlaybookRun({
      userId,
      playbookType: "earnings",
      status: "generating",
      inputData: { ticker },
    });

    const quote = await getQuote(ticker);
    const news = await getNews(ticker);

    const prompt = `You are an earnings analyst. Provide an earnings play analysis for ${ticker}.

Current Data:
- Price: $${quote.c?.toFixed(2) || "N/A"}
- Change: ${quote.dp?.toFixed(2) || "N/A"}%

Recent Headlines:
${news.slice(0, 5).map((n: any) => `- ${n.title}`).join("\n")}

Provide:
1. **Pre-Earnings Assessment** - Current setup heading into earnings
2. **Historical Patterns** - How stock typically reacts to earnings
3. **Options Strategies** - Suggested options plays if applicable
4. **Pre-Earnings Trade** - Potential swing trade setup before report
5. **Post-Earnings Strategy** - How to react to beat/miss scenarios
6. **Risk Considerations** - IV crush, gap risk, etc.

Focus on actionable trading strategies around the earnings event.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const content = response.choices[0].message.content || "";

    const sections = [
      {
        sectionType: "earnings",
        title: `Earnings Play: ${ticker}`,
        content,
        metadata: { ticker, quote },
        priority: "high",
      },
    ];

    await storage.savePlaybookSections(
      sections.map((s) => ({ ...s, runId: run.id }))
    );
    await storage.updatePlaybookRunStatus(run.id, "completed");

    return { success: true, runId: run.id, sections };
  } catch (error: any) {
    return { success: false, sections: [], error: error.message };
  }
}

export async function generateOptionsSignals(
  userId: string,
  ticker: string,
  outlook: string = "neutral",
  timeframe: string = "weekly"
): Promise<PlaybookResult> {
  try {
    const run = await storage.createPlaybookRun({
      userId,
      playbookType: "options",
      status: "generating",
      inputData: { ticker, outlook, timeframe },
    });

    const quote = await getQuote(ticker);
    const news = await getNews(ticker);

    const prompt = `You are an expert options strategist. Generate options trading signals for ${ticker}.

Current Stock Data:
- Price: $${quote.c?.toFixed(2) || "N/A"}
- Change: ${quote.dp?.toFixed(2) || "N/A"}%
- Day High: $${quote.h?.toFixed(2) || "N/A"}
- Day Low: $${quote.l?.toFixed(2) || "N/A"}
- Previous Close: $${quote.pc?.toFixed(2) || "N/A"}

Trader Outlook: ${outlook.toUpperCase()}
Preferred Timeframe: ${timeframe}

Recent News:
${news.slice(0, 3).map((n: any) => `- ${n.title}`).join("\n")}

Provide comprehensive options trade recommendations:

1. **Primary Options Play**
   - Strategy type (call, put, spread, straddle, iron condor, etc.)
   - Strike price(s) with reasoning
   - Expiration date recommendation
   - Entry price range
   - Profit target and stop loss levels

2. **Alternative Strategy**
   - A different approach based on risk tolerance
   - When to use this alternative

3. **Greeks Analysis**
   - Expected Delta exposure
   - Theta decay considerations
   - Implied volatility assessment
   - Vega sensitivity for earnings/events

4. **Risk Management**
   - Max loss scenario
   - Position sizing recommendation (% of portfolio)
   - Adjustment triggers

5. **Key Catalysts**
   - Upcoming events that could impact the trade
   - Optimal entry timing

6. **Exit Plan**
   - Profit-taking levels (25%, 50%, 75%)
   - When to cut losses
   - Roll strategy if applicable

Be specific with strike prices, dates, and dollar amounts. Use realistic options pricing.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = response.choices[0].message.content || "";

    const sections = [
      {
        sectionType: "options",
        title: `Options Signals: ${ticker} (${outlook.toUpperCase()})`,
        content,
        metadata: { ticker, outlook, timeframe, quote },
        priority: "high",
      },
    ];

    await storage.savePlaybookSections(
      sections.map((s) => ({ ...s, runId: run.id }))
    );
    await storage.updatePlaybookRunStatus(run.id, "completed");

    return { success: true, runId: run.id, sections };
  } catch (error: any) {
    return { success: false, sections: [], error: error.message };
  }
}

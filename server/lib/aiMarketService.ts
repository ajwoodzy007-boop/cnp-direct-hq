import OpenAI from "openai";
import { storage } from "../storage";
import { scanMarket, getNews, StockData } from "./marketData";
import { InsertAiSignalInsight, InsertAiPredictionScore } from "@shared/schema";

const getOpenAIKey = () => {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  const integrationKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (integrationKey && !integrationKey.includes("DUMMY")) return integrationKey;
  return process.env.OPENAI_API_KEY || "";
};

const openai = new OpenAI({
  apiKey: getOpenAIKey(),
});

interface AISignalResult {
  ticker: string;
  signal: "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";
  confidence: number;
  reasoning: string;
  entryPrice?: number;
  targetPrice?: number;
  stopLoss?: number;
  technicalFactors: Record<string, any>;
  sentimentFactors: Record<string, any>;
}

interface AIMarketInsights {
  gainersAnalysis: string;
  losersAnalysis: string;
  marketSentiment: string;
  topBuyOpportunities: AISignalResult[];
  topSellWarnings: AISignalResult[];
  timestamp: string;
}

interface AITop10Prediction {
  ticker: string;
  aiConfidence: number;
  predictedDirection: "bullish" | "bearish" | "neutral";
  predictedChange: number;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  reasoning: string;
  factorsUsed: Record<string, any>;
}

interface ModelMetrics {
  totalPredictions: number;
  correctPredictions: number;
  winRate: number;
  avgConfidence: number;
  avgActualReturn: number;
}

export async function analyzeMarketSignal(
  stock: StockData,
  historicalWinRate?: ModelMetrics
): Promise<AISignalResult> {
  const newsData = await getNews(stock.ticker);
  const newsHeadlines = newsData.slice(0, 5).map(n => `- ${n.title} (${n.sentiment})`).join("\n");
  
  const learningContext = historicalWinRate 
    ? `\n\nHistorical Learning Data:
- Win Rate: ${(historicalWinRate.winRate * 100).toFixed(1)}%
- Total Predictions Analyzed: ${historicalWinRate.totalPredictions}
- Average Confidence When Correct: ${historicalWinRate.avgConfidence.toFixed(1)}%
- Average Actual Return: ${(historicalWinRate.avgActualReturn * 100).toFixed(2)}%

Adjust your confidence based on this historical performance data.`
    : "";

  const prompt = `You are an expert trading analyst. Analyze this stock and provide a signal recommendation.

Stock: ${stock.ticker}
Current Price: $${stock.price.toFixed(2)}
Change Today: ${stock.changePercent.toFixed(2)}%
RSI: ${stock.rsi}
Relative Volume: ${stock.rvol}x
Market Sentiment: ${stock.sentiment}
Day Range: $${stock.dayLow.toFixed(2)} - $${stock.dayHigh.toFixed(2)}
Open: $${stock.openPrice.toFixed(2)}
Previous Close: $${stock.prevClose.toFixed(2)}

Recent News:
${newsHeadlines || "No recent news available"}
${learningContext}

Respond in this exact JSON format:
{
  "signal": "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL",
  "confidence": <number 0-100>,
  "reasoning": "<brief 2-3 sentence analysis>",
  "targetPrice": <number or null>,
  "stopLoss": <number or null>,
  "keyFactors": ["factor1", "factor2", "factor3"]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content || "{}";
    const parsed = JSON.parse(content);

    return {
      ticker: stock.ticker,
      signal: parsed.signal || "HOLD",
      confidence: parsed.confidence || 50,
      reasoning: parsed.reasoning || "Unable to analyze",
      entryPrice: stock.price,
      targetPrice: parsed.targetPrice,
      stopLoss: parsed.stopLoss,
      technicalFactors: {
        rsi: stock.rsi,
        rvol: stock.rvol,
        changePercent: stock.changePercent,
        pricePosition: ((stock.price - stock.dayLow) / (stock.dayHigh - stock.dayLow)) * 100,
      },
      sentimentFactors: {
        marketSentiment: stock.sentiment,
        sentimentScore: stock.sentimentScore,
        newsCount: newsData.length,
        keyFactors: parsed.keyFactors || [],
      },
    };
  } catch (error: any) {
    console.error(`AI analysis failed for ${stock.ticker}:`, error.message);
    return generateFallbackSignal(stock);
  }
}

function generateFallbackSignal(stock: StockData): AISignalResult {
  let signal: AISignalResult["signal"] = "HOLD";
  let confidence = 50;
  let reasoning = "Technical analysis based on available indicators.";

  if (stock.rsi < 30 && stock.changePercent < -2) {
    signal = "BUY";
    confidence = 65;
    reasoning = `Oversold conditions with RSI at ${stock.rsi}. Potential bounce opportunity.`;
  } else if (stock.rsi > 70 && stock.changePercent > 2) {
    signal = "SELL";
    confidence = 60;
    reasoning = `Overbought conditions with RSI at ${stock.rsi}. Consider taking profits.`;
  } else if (stock.rvol > 2 && stock.changePercent > 3) {
    signal = "STRONG_BUY";
    confidence = 70;
    reasoning = `Strong momentum with ${stock.rvol}x volume and ${stock.changePercent.toFixed(1)}% gain.`;
  } else if (stock.rvol > 2 && stock.changePercent < -3) {
    signal = "STRONG_SELL";
    confidence = 70;
    reasoning = `Heavy selling pressure with ${stock.rvol}x volume and ${stock.changePercent.toFixed(1)}% loss.`;
  }

  return {
    ticker: stock.ticker,
    signal,
    confidence,
    reasoning,
    entryPrice: stock.price,
    technicalFactors: {
      rsi: stock.rsi,
      rvol: stock.rvol,
      changePercent: stock.changePercent,
    },
    sentimentFactors: {
      marketSentiment: stock.sentiment,
      sentimentScore: stock.sentimentScore,
    },
  };
}

export async function generateMarketInsights(): Promise<AIMarketInsights> {
  const marketData = await scanMarket();
  const sorted = [...marketData].sort((a, b) => b.changePercent - a.changePercent);
  const gainers = sorted.filter(s => s.changePercent > 0).slice(0, 5);
  const losers = sorted.filter(s => s.changePercent < 0).slice(-5).reverse();
  
  const historicalMetrics = await getHistoricalMetrics("market_insights");

  const prompt = `You are a market analyst. Analyze today's market movers and identify opportunities.

TOP GAINERS:
${gainers.map(g => `${g.ticker}: +${g.changePercent.toFixed(2)}% at $${g.price.toFixed(2)}, RSI: ${g.rsi}, RVOL: ${g.rvol}x, Sentiment: ${g.sentiment}`).join("\n")}

TOP LOSERS:
${losers.map(l => `${l.ticker}: ${l.changePercent.toFixed(2)}% at $${l.price.toFixed(2)}, RSI: ${l.rsi}, RVOL: ${l.rvol}x, Sentiment: ${l.sentiment}`).join("\n")}

${historicalMetrics ? `Historical Win Rate: ${(historicalMetrics.winRate * 100).toFixed(1)}%` : ""}

Provide analysis in JSON format:
{
  "gainersAnalysis": "<2-3 sentences on gainers>",
  "losersAnalysis": "<2-3 sentences on losers>",
  "marketSentiment": "bullish" | "bearish" | "neutral",
  "topBuys": [{"ticker": "XXX", "confidence": 80, "reasoning": "..."}, ...],
  "topSells": [{"ticker": "XXX", "confidence": 75, "reasoning": "..."}, ...]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 1000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content || "{}";
    const parsed = JSON.parse(content);

    const topBuyOpportunities: AISignalResult[] = (parsed.topBuys || []).slice(0, 5).map((b: any) => {
      const stock = marketData.find(s => s.ticker === b.ticker);
      return {
        ticker: b.ticker,
        signal: "BUY" as const,
        confidence: b.confidence || 70,
        reasoning: b.reasoning || "AI identified opportunity",
        entryPrice: stock?.price,
        technicalFactors: stock ? { rsi: stock.rsi, rvol: stock.rvol } : {},
        sentimentFactors: {},
      };
    });

    const topSellWarnings: AISignalResult[] = (parsed.topSells || []).slice(0, 5).map((s: any) => {
      const stock = marketData.find(st => st.ticker === s.ticker);
      return {
        ticker: s.ticker,
        signal: "SELL" as const,
        confidence: s.confidence || 70,
        reasoning: s.reasoning || "AI identified risk",
        entryPrice: stock?.price,
        technicalFactors: stock ? { rsi: stock.rsi, rvol: stock.rvol } : {},
        sentimentFactors: {},
      };
    });

    return {
      gainersAnalysis: parsed.gainersAnalysis || "Market showing mixed signals.",
      losersAnalysis: parsed.losersAnalysis || "Some stocks under pressure.",
      marketSentiment: parsed.marketSentiment || "neutral",
      topBuyOpportunities,
      topSellWarnings,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error("AI market insights failed:", error.message);
    return generateFallbackInsights(marketData);
  }
}

function generateFallbackInsights(marketData: StockData[]): AIMarketInsights {
  const sorted = [...marketData].sort((a, b) => b.changePercent - a.changePercent);
  const gainers = sorted.filter(s => s.changePercent > 0).slice(0, 5);
  const losers = sorted.filter(s => s.changePercent < 0).slice(-5).reverse();
  
  const buyOpportunities = marketData
    .filter(s => s.rsi < 40 || (s.changePercent > 2 && s.rvol > 1.5))
    .sort((a, b) => a.rsi - b.rsi)
    .slice(0, 5)
    .map(s => generateFallbackSignal(s));

  const sellWarnings = marketData
    .filter(s => s.rsi > 60 || (s.changePercent < -2 && s.rvol > 1.5))
    .sort((a, b) => b.rsi - a.rsi)
    .slice(0, 5)
    .map(s => generateFallbackSignal(s));

  return {
    gainersAnalysis: `Top performers today include ${gainers.slice(0, 3).map(g => g.ticker).join(", ")} showing strong momentum.`,
    losersAnalysis: `Weakness seen in ${losers.slice(0, 3).map(l => l.ticker).join(", ")} with selling pressure.`,
    marketSentiment: gainers.length > losers.length ? "bullish" : "bearish",
    topBuyOpportunities: buyOpportunities,
    topSellWarnings: sellWarnings,
    timestamp: new Date().toISOString(),
  };
}

export async function generateTop10Predictions(): Promise<AITop10Prediction[]> {
  const marketData = await scanMarket();
  const historicalMetrics = await getHistoricalMetrics("top10_predictions");
  
  const signals = await Promise.all(
    marketData.slice(0, 15).map(stock => analyzeMarketSignal(stock, historicalMetrics || undefined))
  );

  const buySignals = signals
    .filter(s => s.signal === "STRONG_BUY" || s.signal === "BUY")
    .sort((a, b) => b.confidence - a.confidence);

  const predictions: AITop10Prediction[] = buySignals.slice(0, 10).map(signal => {
    const stock = marketData.find(s => s.ticker === signal.ticker)!;
    const predictedChange = signal.signal === "STRONG_BUY" 
      ? 2 + Math.random() * 3 
      : 1 + Math.random() * 2;

    return {
      ticker: signal.ticker,
      aiConfidence: signal.confidence,
      predictedDirection: "bullish" as const,
      predictedChange,
      entryPrice: stock.price,
      targetPrice: signal.targetPrice || stock.price * (1 + predictedChange / 100),
      stopLoss: signal.stopLoss || stock.price * 0.97,
      reasoning: signal.reasoning,
      factorsUsed: {
        ...signal.technicalFactors,
        ...signal.sentimentFactors,
        signal: signal.signal,
      },
    };
  });

  for (const pred of predictions) {
    try {
      await storage.saveAiPredictionScore({
        ticker: pred.ticker,
        predictionType: "daily",
        aiConfidence: pred.aiConfidence,
        predictedDirection: pred.predictedDirection,
        predictedChange: pred.predictedChange,
        entryPrice: pred.entryPrice,
        targetPrice: pred.targetPrice,
        stopLoss: pred.stopLoss,
        aiReasoning: pred.reasoning,
        factorsUsed: pred.factorsUsed,
      });
    } catch (err) {
      console.error(`Failed to save prediction for ${pred.ticker}:`, err);
    }
  }

  return predictions;
}

export async function validateMarketSentinelSignals(
  signals: Array<{ ticker: string; type: string; price: number; confidence: number }>
): Promise<Array<{ ticker: string; validated: boolean; aiConfidence: number; aiReasoning: string; adjustedSignal?: string }>> {
  const marketData = await scanMarket();
  const historicalMetrics = await getHistoricalMetrics("market_sentinel");

  const results = await Promise.all(
    signals.map(async (signal) => {
      const stock = marketData.find(s => s.ticker === signal.ticker);
      if (!stock) {
        return {
          ticker: signal.ticker,
          validated: false,
          aiConfidence: 0,
          aiReasoning: "Stock not found in market data",
        };
      }

      const aiAnalysis = await analyzeMarketSignal(stock, historicalMetrics || undefined);
      
      const signalAligns = 
        (signal.type.includes("BUY") && (aiAnalysis.signal === "BUY" || aiAnalysis.signal === "STRONG_BUY")) ||
        (signal.type.includes("SELL") && (aiAnalysis.signal === "SELL" || aiAnalysis.signal === "STRONG_SELL"));

      await storage.saveAiSignalInsight({
        ticker: signal.ticker,
        surface: "market_sentinel",
        signalType: aiAnalysis.signal,
        confidence: aiAnalysis.confidence,
        aiReasoning: aiAnalysis.reasoning,
        technicalFactors: aiAnalysis.technicalFactors,
        sentimentFactors: aiAnalysis.sentimentFactors,
        priceTargets: {
          entry: aiAnalysis.entryPrice,
          target: aiAnalysis.targetPrice,
          stopLoss: aiAnalysis.stopLoss,
        },
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      return {
        ticker: signal.ticker,
        validated: signalAligns,
        aiConfidence: aiAnalysis.confidence,
        aiReasoning: aiAnalysis.reasoning,
        adjustedSignal: signalAligns ? undefined : aiAnalysis.signal,
      };
    })
  );

  return results;
}

export async function updatePredictionOutcomes(): Promise<{
  updated: number;
  wins: number;
  losses: number;
}> {
  const pendingPredictions = await storage.getPendingAiPredictions();
  const marketData = await scanMarket();
  
  let updated = 0;
  let wins = 0;
  let losses = 0;

  for (const prediction of pendingPredictions) {
    const stock = marketData.find(s => s.ticker === prediction.ticker);
    if (!stock) continue;

    const actualChange = ((stock.price - prediction.entryPrice) / prediction.entryPrice) * 100;
    const isWin = 
      (prediction.predictedDirection === "bullish" && actualChange > 0) ||
      (prediction.predictedDirection === "bearish" && actualChange < 0);

    await storage.updateAiPredictionOutcome(prediction.id, {
      actualOutcome: isWin ? "win" : "loss",
      actualChange,
      outcomePrice: stock.price,
      outcomeDate: new Date(),
    });

    updated++;
    if (isWin) wins++;
    else losses++;
  }

  if (updated > 0) {
    await updateModelMetrics("top10_predictions", wins, losses);
  }

  return { updated, wins, losses };
}

async function getHistoricalMetrics(surface: string): Promise<ModelMetrics | null> {
  try {
    const metrics = await storage.getLatestModelMetrics(surface);
    return metrics;
  } catch {
    return null;
  }
}

async function updateModelMetrics(surface: string, wins: number, total: number): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  const existing = await storage.getModelMetricsByDate(surface, today);
  
  if (existing) {
    await storage.updateModelMetrics(existing.id, {
      totalPredictions: (existing.totalPredictions || 0) + total,
      correctPredictions: (existing.correctPredictions || 0) + wins,
      winRate: ((existing.correctPredictions || 0) + wins) / ((existing.totalPredictions || 0) + total),
    });
  } else {
    await storage.saveModelMetrics({
      metricDate: today,
      surface,
      totalPredictions: total,
      correctPredictions: wins,
      winRate: total > 0 ? wins / total : 0,
      avgConfidence: 0,
    });
  }
}

export async function getAIAccuracyStats(): Promise<{
  overall: ModelMetrics;
  byFeature: Record<string, ModelMetrics>;
  recentTrend: { date: string; winRate: number }[];
}> {
  const allMetrics = await storage.getAllModelMetrics();
  
  const byFeature: Record<string, ModelMetrics> = {};
  let totalPreds = 0;
  let totalWins = 0;
  let totalConfidence = 0;
  let totalReturn = 0;
  let count = 0;

  for (const metric of allMetrics) {
    totalPreds += metric.totalPredictions || 0;
    totalWins += metric.correctPredictions || 0;
    totalConfidence += (metric.avgConfidence || 0) * (metric.totalPredictions || 0);
    totalReturn += (metric.avgActualReturn || 0) * (metric.totalPredictions || 0);
    count++;

    if (!byFeature[metric.surface]) {
      byFeature[metric.surface] = {
        totalPredictions: 0,
        correctPredictions: 0,
        winRate: 0,
        avgConfidence: 0,
        avgActualReturn: 0,
      };
    }
    byFeature[metric.surface].totalPredictions += metric.totalPredictions || 0;
    byFeature[metric.surface].correctPredictions += metric.correctPredictions || 0;
  }

  for (const surface in byFeature) {
    const f = byFeature[surface];
    f.winRate = f.totalPredictions > 0 ? f.correctPredictions / f.totalPredictions : 0;
  }

  const recentMetrics = allMetrics
    .sort((a, b) => b.metricDate.localeCompare(a.metricDate))
    .slice(0, 7)
    .map(m => ({ date: m.metricDate, winRate: m.winRate || 0 }))
    .reverse();

  return {
    overall: {
      totalPredictions: totalPreds,
      correctPredictions: totalWins,
      winRate: totalPreds > 0 ? totalWins / totalPreds : 0,
      avgConfidence: totalPreds > 0 ? totalConfidence / totalPreds : 0,
      avgActualReturn: totalPreds > 0 ? totalReturn / totalPreds : 0,
    },
    byFeature,
    recentTrend: recentMetrics,
  };
}

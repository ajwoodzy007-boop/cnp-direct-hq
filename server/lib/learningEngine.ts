import { db } from '../db';
import { predictions } from '@shared/schema';
import { eq, and, gte, isNotNull, sql } from 'drizzle-orm';

export interface LearningFactors {
  signalMultipliers: Record<string, number>;
  rsiRangeMultipliers: Record<string, number>;
  sectorMultipliers: Record<string, number>;
  confidenceMultipliers: Record<string, number>;
  volumeMultiplier: number;
  sentimentMultiplier: number;
  lastUpdated: Date;
  sampleSize: number;
}

interface PerformanceMetric {
  wins: number;
  losses: number;
  total: number;
  winRate: number;
}

const DEFAULT_FACTORS: LearningFactors = {
  signalMultipliers: {
    'MOMENTUM BUY': 1.0,
    'VALUE BUY': 1.0,
    'SPECULATIVE BUY': 1.0,
    'WAIT': 1.0,
    'SELL WARNING': 1.0,
  },
  rsiRangeMultipliers: {
    'oversold': 1.0,      // RSI < 35
    'optimal': 1.0,       // RSI 35-65
    'overbought': 1.0,    // RSI > 65
  },
  sectorMultipliers: {},
  confidenceMultipliers: {
    'High': 1.0,
    'Med': 1.0,
    'Low': 1.0,
  },
  volumeMultiplier: 1.0,
  sentimentMultiplier: 1.0,
  lastUpdated: new Date(),
  sampleSize: 0,
};

let cachedFactors: LearningFactors | null = null;
let lastCacheTime: Date | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour cache

function calculateMultiplier(winRate: number, baselineWinRate: number): number {
  if (baselineWinRate === 0) return 1.0;
  
  const ratio = winRate / baselineWinRate;
  const multiplier = 0.5 + (ratio * 0.5);
  
  return Math.max(0.3, Math.min(2.0, multiplier));
}

function getRsiRange(rsi: number | null | undefined): string {
  if (rsi == null) return 'optimal';
  if (rsi < 35) return 'oversold';
  if (rsi > 65) return 'overbought';
  return 'optimal';
}

export async function analyzePredictionPerformance(): Promise<LearningFactors> {
  if (cachedFactors && lastCacheTime && (Date.now() - lastCacheTime.getTime() < CACHE_TTL_MS)) {
    return cachedFactors;
  }

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const historicalPredictions = await db
      .select()
      .from(predictions)
      .where(
        and(
          gte(predictions.predictionDate, thirtyDaysAgo),
          isNotNull(predictions.outcome),
          sql`${predictions.outcome} IN ('win', 'loss')`
        )
      );

    if (historicalPredictions.length < 20) {
      console.log(`[Learning] Insufficient data (${historicalPredictions.length} predictions), using defaults`);
      return { ...DEFAULT_FACTORS, lastUpdated: new Date(), sampleSize: historicalPredictions.length };
    }

    const totalWins = historicalPredictions.filter(p => p.outcome === 'win').length;
    const baselineWinRate = totalWins / historicalPredictions.length;
    
    console.log(`[Learning] Analyzing ${historicalPredictions.length} predictions, baseline win rate: ${(baselineWinRate * 100).toFixed(1)}%`);

    const signalPerformance: Record<string, PerformanceMetric> = {};
    const rsiPerformance: Record<string, PerformanceMetric> = {};
    const sectorPerformance: Record<string, PerformanceMetric> = {};
    const confidencePerformance: Record<string, PerformanceMetric> = {};
    
    let highVolumeWins = 0, highVolumeTotal = 0;
    let bullishSentimentWins = 0, bullishSentimentTotal = 0;

    for (const pred of historicalPredictions) {
      const isWin = pred.outcome === 'win';
      
      const signal = pred.signalType || 'UNKNOWN';
      if (!signalPerformance[signal]) {
        signalPerformance[signal] = { wins: 0, losses: 0, total: 0, winRate: 0 };
      }
      signalPerformance[signal].total++;
      if (isWin) signalPerformance[signal].wins++;
      else signalPerformance[signal].losses++;

      const rsiRange = getRsiRange(pred.rsi);
      if (!rsiPerformance[rsiRange]) {
        rsiPerformance[rsiRange] = { wins: 0, losses: 0, total: 0, winRate: 0 };
      }
      rsiPerformance[rsiRange].total++;
      if (isWin) rsiPerformance[rsiRange].wins++;
      else rsiPerformance[rsiRange].losses++;

      const sector = pred.sector || 'Unknown';
      if (!sectorPerformance[sector]) {
        sectorPerformance[sector] = { wins: 0, losses: 0, total: 0, winRate: 0 };
      }
      sectorPerformance[sector].total++;
      if (isWin) sectorPerformance[sector].wins++;
      else sectorPerformance[sector].losses++;

      const confidence = pred.confidence || 'Med';
      if (!confidencePerformance[confidence]) {
        confidencePerformance[confidence] = { wins: 0, losses: 0, total: 0, winRate: 0 };
      }
      confidencePerformance[confidence].total++;
      if (isWin) confidencePerformance[confidence].wins++;
      else confidencePerformance[confidence].losses++;

      if (pred.rvol && pred.rvol > 1.5) {
        highVolumeTotal++;
        if (isWin) highVolumeWins++;
      }

      if (pred.reasoning?.toLowerCase().includes('bullish')) {
        bullishSentimentTotal++;
        if (isWin) bullishSentimentWins++;
      }
    }

    for (const key of Object.keys(signalPerformance)) {
      signalPerformance[key].winRate = signalPerformance[key].wins / signalPerformance[key].total;
    }
    for (const key of Object.keys(rsiPerformance)) {
      rsiPerformance[key].winRate = rsiPerformance[key].wins / rsiPerformance[key].total;
    }
    for (const key of Object.keys(sectorPerformance)) {
      sectorPerformance[key].winRate = sectorPerformance[key].wins / sectorPerformance[key].total;
    }
    for (const key of Object.keys(confidencePerformance)) {
      confidencePerformance[key].winRate = confidencePerformance[key].wins / confidencePerformance[key].total;
    }

    const factors: LearningFactors = {
      signalMultipliers: {},
      rsiRangeMultipliers: {},
      sectorMultipliers: {},
      confidenceMultipliers: {},
      volumeMultiplier: 1.0,
      sentimentMultiplier: 1.0,
      lastUpdated: new Date(),
      sampleSize: historicalPredictions.length,
    };

    for (const [signal, perf] of Object.entries(signalPerformance)) {
      if (perf.total >= 5) {
        factors.signalMultipliers[signal] = calculateMultiplier(perf.winRate, baselineWinRate);
        console.log(`[Learning] Signal "${signal}": ${(perf.winRate * 100).toFixed(1)}% win rate (${perf.total} samples) -> ${factors.signalMultipliers[signal].toFixed(2)}x`);
      } else {
        factors.signalMultipliers[signal] = 1.0;
      }
    }

    for (const [range, perf] of Object.entries(rsiPerformance)) {
      if (perf.total >= 5) {
        factors.rsiRangeMultipliers[range] = calculateMultiplier(perf.winRate, baselineWinRate);
        console.log(`[Learning] RSI "${range}": ${(perf.winRate * 100).toFixed(1)}% win rate (${perf.total} samples) -> ${factors.rsiRangeMultipliers[range].toFixed(2)}x`);
      } else {
        factors.rsiRangeMultipliers[range] = 1.0;
      }
    }

    for (const [sector, perf] of Object.entries(sectorPerformance)) {
      if (perf.total >= 3 && sector !== 'Unknown') {
        factors.sectorMultipliers[sector] = calculateMultiplier(perf.winRate, baselineWinRate);
        console.log(`[Learning] Sector "${sector}": ${(perf.winRate * 100).toFixed(1)}% win rate (${perf.total} samples) -> ${factors.sectorMultipliers[sector].toFixed(2)}x`);
      }
    }

    for (const [conf, perf] of Object.entries(confidencePerformance)) {
      if (perf.total >= 5) {
        factors.confidenceMultipliers[conf] = calculateMultiplier(perf.winRate, baselineWinRate);
        console.log(`[Learning] Confidence "${conf}": ${(perf.winRate * 100).toFixed(1)}% win rate (${perf.total} samples) -> ${factors.confidenceMultipliers[conf].toFixed(2)}x`);
      } else {
        factors.confidenceMultipliers[conf] = 1.0;
      }
    }

    if (highVolumeTotal >= 5) {
      const highVolumeWinRate = highVolumeWins / highVolumeTotal;
      factors.volumeMultiplier = calculateMultiplier(highVolumeWinRate, baselineWinRate);
      console.log(`[Learning] High volume: ${(highVolumeWinRate * 100).toFixed(1)}% win rate (${highVolumeTotal} samples) -> ${factors.volumeMultiplier.toFixed(2)}x`);
    }

    if (bullishSentimentTotal >= 5) {
      const sentimentWinRate = bullishSentimentWins / bullishSentimentTotal;
      factors.sentimentMultiplier = calculateMultiplier(sentimentWinRate, baselineWinRate);
      console.log(`[Learning] Bullish sentiment: ${(sentimentWinRate * 100).toFixed(1)}% win rate (${bullishSentimentTotal} samples) -> ${factors.sentimentMultiplier.toFixed(2)}x`);
    }

    cachedFactors = factors;
    lastCacheTime = new Date();

    return factors;
  } catch (error) {
    console.error('[Learning] Error analyzing performance:', error);
    return DEFAULT_FACTORS;
  }
}

export function applyLearningToScore(
  baseScore: number,
  factors: LearningFactors,
  stock: {
    signal: string;
    rsi?: number | null;
    sector?: string | null;
    confidence?: string;
    rvol?: number;
    hasBullishSentiment?: boolean;
  }
): number {
  let adjustedScore = baseScore;

  const signalMult = factors.signalMultipliers[stock.signal] || 1.0;
  adjustedScore *= signalMult;

  const rsiRange = getRsiRange(stock.rsi);
  const rsiMult = factors.rsiRangeMultipliers[rsiRange] || 1.0;
  adjustedScore *= rsiMult;

  if (stock.sector && factors.sectorMultipliers[stock.sector]) {
    adjustedScore *= factors.sectorMultipliers[stock.sector];
  }

  if (stock.confidence && factors.confidenceMultipliers[stock.confidence]) {
    adjustedScore *= factors.confidenceMultipliers[stock.confidence];
  }

  if (stock.rvol && stock.rvol > 1.5) {
    adjustedScore *= factors.volumeMultiplier;
  }

  if (stock.hasBullishSentiment) {
    adjustedScore *= factors.sentimentMultiplier;
  }

  return Math.round(adjustedScore * 100) / 100;
}

export async function getLearningStats(): Promise<{
  factors: LearningFactors;
  insights: string[];
}> {
  const factors = await analyzePredictionPerformance();
  const insights: string[] = [];

  for (const [signal, mult] of Object.entries(factors.signalMultipliers)) {
    if (mult > 1.2) {
      insights.push(`${signal} signals are outperforming (${((mult - 1) * 100).toFixed(0)}% boost)`);
    } else if (mult < 0.8) {
      insights.push(`${signal} signals are underperforming (${((1 - mult) * 100).toFixed(0)}% penalty)`);
    }
  }

  for (const [range, mult] of Object.entries(factors.rsiRangeMultipliers)) {
    if (mult > 1.2) {
      insights.push(`${range} RSI stocks are winning more often`);
    } else if (mult < 0.8) {
      insights.push(`${range} RSI stocks are losing more often`);
    }
  }

  const topSectors = Object.entries(factors.sectorMultipliers)
    .filter(([_, mult]) => mult > 1.1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  
  if (topSectors.length > 0) {
    insights.push(`Top performing sectors: ${topSectors.map(([s]) => s).join(', ')}`);
  }

  const worstSectors = Object.entries(factors.sectorMultipliers)
    .filter(([_, mult]) => mult < 0.9)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3);
  
  if (worstSectors.length > 0) {
    insights.push(`Underperforming sectors: ${worstSectors.map(([s]) => s).join(', ')}`);
  }

  return { factors, insights };
}

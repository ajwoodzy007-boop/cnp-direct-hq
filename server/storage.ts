import { type User, type InsertUser, type Prediction, type InsertPrediction, type WatchlistItem, type InsertWatchlist, type AffiliateClick, type InsertAffiliateClick, type WeeklyRecommendation, type InsertWeeklyRecommendation, type DailyPredictionRun, type InsertDailyPredictionRun, type DailyPredictionEntry, type InsertDailyPredictionEntry, type UserProfile, type InsertUserProfile, type UserPortfolioItem, type InsertUserPortfolio, type AiPlaybookRun, type InsertAiPlaybookRun, type PlaybookSection, type InsertPlaybookSection, type CachedMarketMetric, type InsertCachedMarketMetric, predictions, dailyPredictionRuns, dailyPredictionEntries, userProfiles, userPortfolio, aiPlaybookRuns, playbookSections, cachedMarketMetrics } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { sql, eq, desc, and, gt } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createPrediction(prediction: InsertPrediction): Promise<Prediction>;
  getPredictions(): Promise<Prediction[]>;
  getPredictionsWithPerformance(): Promise<(Prediction & { percentChange?: number })[]>;
  updatePredictionOutcome(id: string, outcome: string, outcomePrice: number): Promise<Prediction | undefined>;
  getWatchlist(): Promise<WatchlistItem[]>;
  addToWatchlist(item: InsertWatchlist): Promise<WatchlistItem>;
  removeFromWatchlist(ticker: string): Promise<boolean>;
  getStripeProducts(): Promise<any[]>;
  getStripeProductsWithPrices(): Promise<any[]>;
  getStripeSubscription(subscriptionId: string): Promise<any>;
  logAffiliateClick(click: InsertAffiliateClick): Promise<AffiliateClick>;
  getAffiliateClicks(): Promise<AffiliateClick[]>;
  getAffiliateClickStats(): Promise<{ ticker: string; count: number }[]>;
  getWeeklyRecommendations(): Promise<WeeklyRecommendation[]>;
  saveWeeklyRecommendations(recommendations: InsertWeeklyRecommendation[]): Promise<WeeklyRecommendation[]>;
  // Historical prediction tracking
  createDailyPredictionRun(runDate: string): Promise<DailyPredictionRun>;
  getDailyPredictionRun(runDate: string): Promise<DailyPredictionRun | undefined>;
  saveDailyPredictionEntries(runId: string, entries: Omit<InsertDailyPredictionEntry, 'runId'>[]): Promise<DailyPredictionEntry[]>;
  finalizeDailyPredictionRun(runDate: string, entries: { ticker: string; closePrice: number; currentPrice: number; closePnl: number; totalPnl: number; outcome: string }[]): Promise<void>;
  getDailyPredictionHistory(limit?: number): Promise<(DailyPredictionRun & { entries: DailyPredictionEntry[] })[]>;
  getDailyPredictionStats(): Promise<{ totalRuns: number; totalPicks: number; wins: number; losses: number; pending: number; winRate: number; avgPnl: number }>;
  // AI Playbook Premium Features
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  createOrUpdateUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  checkPremiumStatus(userId: string): Promise<boolean>;
  updateSubscriptionStatus(userId: string, status: string, subscriptionId?: string, periodEnd?: Date): Promise<void>;
  getUserPortfolio(userId: string): Promise<UserPortfolioItem[]>;
  addToUserPortfolio(item: InsertUserPortfolio): Promise<UserPortfolioItem>;
  removeFromUserPortfolio(userId: string, ticker: string): Promise<boolean>;
  createPlaybookRun(run: InsertAiPlaybookRun): Promise<AiPlaybookRun>;
  getPlaybookRun(runId: string): Promise<AiPlaybookRun | undefined>;
  getLatestPlaybookRun(userId: string, playbookType: string): Promise<AiPlaybookRun | undefined>;
  updatePlaybookRunStatus(runId: string, status: string): Promise<void>;
  savePlaybookSections(sections: InsertPlaybookSection[]): Promise<PlaybookSection[]>;
  getPlaybookSections(runId: string): Promise<PlaybookSection[]>;
  getCachedMetric(metricType: string, ticker?: string): Promise<CachedMarketMetric | undefined>;
  saveMarketMetric(metric: InsertCachedMarketMetric): Promise<CachedMarketMetric>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private predictions: Map<string, Prediction>;
  private watchlistItems: Map<string, WatchlistItem>;
  private affiliateClicksList: AffiliateClick[];
  private weeklyRecommendationsList: WeeklyRecommendation[];

  constructor() {
    this.users = new Map();
    this.predictions = new Map();
    this.watchlistItems = new Map();
    this.affiliateClicksList = [];
    this.weeklyRecommendationsList = [];
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createPrediction(insertPrediction: InsertPrediction): Promise<Prediction> {
    const result = await db.insert(predictions).values({
      ticker: insertPrediction.ticker,
      signalType: insertPrediction.signalType,
      entryPrice: insertPrediction.entryPrice,
    }).returning();
    return result[0];
  }

  async createHistoricalPrediction(data: {
    ticker: string;
    signalType: string;
    entryPrice: number;
    predictionDate: Date;
    outcome: string;
    outcomePrice: number;
    outcomeDate: Date;
  }): Promise<Prediction> {
    const result = await db.insert(predictions).values({
      ticker: data.ticker,
      signalType: data.signalType,
      entryPrice: data.entryPrice,
      predictionDate: data.predictionDate,
      outcome: data.outcome,
      outcomePrice: data.outcomePrice,
      outcomeDate: data.outcomeDate,
    }).returning();
    return result[0];
  }

  async clearAllPredictions(): Promise<void> {
    await db.delete(predictions);
  }

  async getPredictions(): Promise<Prediction[]> {
    const result = await db.select().from(predictions).orderBy(sql`prediction_date DESC`);
    return result;
  }

  async updatePredictionOutcome(id: string, outcome: string, outcomePrice: number): Promise<Prediction | undefined> {
    const result = await db.update(predictions)
      .set({ outcome, outcomePrice, outcomeDate: new Date() })
      .where(eq(predictions.id, id))
      .returning();
    return result[0];
  }

  async getWatchlist(): Promise<WatchlistItem[]> {
    return Array.from(this.watchlistItems.values()).sort(
      (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
    );
  }

  async addToWatchlist(item: InsertWatchlist): Promise<WatchlistItem> {
    const existing = Array.from(this.watchlistItems.values()).find(
      w => w.ticker.toUpperCase() === item.ticker.toUpperCase()
    );
    if (existing) return existing;

    const id = randomUUID();
    const watchlistItem: WatchlistItem = {
      id,
      ticker: item.ticker.toUpperCase(),
      addedAt: new Date(),
    };
    this.watchlistItems.set(id, watchlistItem);
    return watchlistItem;
  }

  async removeFromWatchlist(ticker: string): Promise<boolean> {
    const item = Array.from(this.watchlistItems.values()).find(
      w => w.ticker.toUpperCase() === ticker.toUpperCase()
    );
    if (!item) return false;
    this.watchlistItems.delete(item.id);
    return true;
  }

  async getStripeProducts(): Promise<any[]> {
    try {
      const result = await db.execute(
        sql`SELECT * FROM stripe.products WHERE active = true ORDER BY name`
      );
      return result.rows;
    } catch {
      return [];
    }
  }

  async getStripeProductsWithPrices(): Promise<any[]> {
    try {
      const result = await db.execute(
        sql`
          SELECT 
            p.id as product_id,
            p.name as product_name,
            p.description as product_description,
            p.active as product_active,
            p.metadata as product_metadata,
            pr.id as price_id,
            pr.unit_amount,
            pr.currency,
            pr.recurring,
            pr.active as price_active
          FROM stripe.products p
          LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
          WHERE p.active = true
          ORDER BY p.name, pr.unit_amount
        `
      );
      return result.rows;
    } catch {
      return [];
    }
  }

  async getStripeSubscription(subscriptionId: string): Promise<any> {
    try {
      const result = await db.execute(
        sql`SELECT * FROM stripe.subscriptions WHERE id = ${subscriptionId}`
      );
      return result.rows[0] || null;
    } catch {
      return null;
    }
  }

  async logAffiliateClick(click: InsertAffiliateClick): Promise<AffiliateClick> {
    const id = randomUUID();
    const affiliateClick: AffiliateClick = {
      id,
      ticker: click.ticker.toUpperCase(),
      destination: click.destination,
      referrer: click.referrer || null,
      userAgent: click.userAgent || null,
      clickedAt: new Date(),
    };
    this.affiliateClicksList.push(affiliateClick);
    return affiliateClick;
  }

  async getAffiliateClicks(): Promise<AffiliateClick[]> {
    return [...this.affiliateClicksList].sort(
      (a, b) => new Date(b.clickedAt).getTime() - new Date(a.clickedAt).getTime()
    );
  }

  async getAffiliateClickStats(): Promise<{ ticker: string; count: number }[]> {
    const counts: Record<string, number> = {};
    for (const click of this.affiliateClicksList) {
      counts[click.ticker] = (counts[click.ticker] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([ticker, count]) => ({ ticker, count }))
      .sort((a, b) => b.count - a.count);
  }

  async getPredictionsWithPerformance(): Promise<(Prediction & { percentChange?: number })[]> {
    const predictions = await this.getPredictions();
    return predictions.map(p => ({
      ...p,
      percentChange: p.outcomePrice && p.entryPrice 
        ? parseFloat((((p.outcomePrice - p.entryPrice) / p.entryPrice) * 100).toFixed(2))
        : undefined
    }));
  }

  async getWeeklyRecommendations(): Promise<WeeklyRecommendation[]> {
    const weekStart = this.getWeekStart();
    return this.weeklyRecommendationsList
      .filter(r => new Date(r.weekStart).getTime() === weekStart.getTime())
      .sort((a, b) => (b.gainPercent || 0) - (a.gainPercent || 0));
  }

  async saveWeeklyRecommendations(recommendations: InsertWeeklyRecommendation[]): Promise<WeeklyRecommendation[]> {
    const weekStart = this.getWeekStart();
    this.weeklyRecommendationsList = this.weeklyRecommendationsList.filter(
      r => new Date(r.weekStart).getTime() !== weekStart.getTime()
    );
    
    const saved: WeeklyRecommendation[] = [];
    for (const rec of recommendations) {
      const item: WeeklyRecommendation = {
        id: randomUUID(),
        ticker: rec.ticker,
        weekStart: rec.weekStart,
        signalType: rec.signalType,
        entryPrice: rec.entryPrice,
        currentPrice: rec.currentPrice || null,
        gainPercent: rec.gainPercent || null,
        reasoning: rec.reasoning || null,
        createdAt: new Date(),
      };
      this.weeklyRecommendationsList.push(item);
      saved.push(item);
    }
    return saved;
  }

  private getWeekStart(): Date {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(now.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  async createDailyPredictionRun(runDate: string): Promise<DailyPredictionRun> {
    const existing = await this.getDailyPredictionRun(runDate);
    if (existing) return existing;
    
    const result = await db.insert(dailyPredictionRuns).values({
      runDate,
      marketOpen: "true",
    }).returning();
    return result[0];
  }

  async getDailyPredictionRun(runDate: string): Promise<DailyPredictionRun | undefined> {
    const result = await db.select().from(dailyPredictionRuns).where(eq(dailyPredictionRuns.runDate, runDate));
    return result[0];
  }

  async saveDailyPredictionEntries(runId: string, entries: Omit<InsertDailyPredictionEntry, 'runId'>[]): Promise<DailyPredictionEntry[]> {
    if (entries.length === 0) return [];
    
    const values = entries.map(entry => ({
      runId,
      ticker: entry.ticker,
      confidence: entry.confidence,
      reasoning: entry.reasoning,
      entryPrice: entry.entryPrice,
      predictedPrice: entry.predictedPrice,
      closePrice: entry.closePrice,
      currentPrice: entry.currentPrice,
      closePnl: entry.closePnl,
      totalPnl: entry.totalPnl,
      outcome: entry.outcome,
    }));
    
    const result = await db.insert(dailyPredictionEntries).values(values).returning();
    return result;
  }

  async finalizeDailyPredictionRun(runDate: string, entries: { ticker: string; closePrice: number; currentPrice: number; closePnl: number; totalPnl: number; outcome: string }[]): Promise<void> {
    const run = await this.getDailyPredictionRun(runDate);
    if (!run) return;
    
    // Update each entry
    for (const entry of entries) {
      await db.update(dailyPredictionEntries)
        .set({
          closePrice: entry.closePrice,
          currentPrice: entry.currentPrice,
          closePnl: entry.closePnl,
          totalPnl: entry.totalPnl,
          outcome: entry.outcome,
        })
        .where(sql`${dailyPredictionEntries.runId} = ${run.id} AND ${dailyPredictionEntries.ticker} = ${entry.ticker}`);
    }
    
    // Mark run as finalized
    await db.update(dailyPredictionRuns)
      .set({ finalizedAt: new Date() })
      .where(eq(dailyPredictionRuns.id, run.id));
  }

  async getDailyPredictionHistory(limit: number = 30): Promise<(DailyPredictionRun & { entries: DailyPredictionEntry[] })[]> {
    const runs = await db.select()
      .from(dailyPredictionRuns)
      .orderBy(desc(dailyPredictionRuns.runDate))
      .limit(limit);
    
    const result: (DailyPredictionRun & { entries: DailyPredictionEntry[] })[] = [];
    
    for (const run of runs) {
      const entries = await db.select()
        .from(dailyPredictionEntries)
        .where(eq(dailyPredictionEntries.runId, run.id));
      result.push({ ...run, entries });
    }
    
    return result;
  }

  async getDailyPredictionStats(): Promise<{ totalRuns: number; totalPicks: number; wins: number; losses: number; pending: number; winRate: number; avgPnl: number }> {
    const runs = await db.select().from(dailyPredictionRuns);
    const allEntries = await db.select().from(dailyPredictionEntries);
    
    const wins = allEntries.filter(e => e.outcome === 'win').length;
    const losses = allEntries.filter(e => e.outcome === 'loss').length;
    const pending = allEntries.filter(e => !e.outcome || e.outcome === 'pending').length;
    const resolved = wins + losses;
    const winRate = resolved > 0 ? (wins / resolved) * 100 : 0;
    
    const pnls = allEntries.filter(e => e.closePnl !== null).map(e => e.closePnl!);
    const avgPnl = pnls.length > 0 ? pnls.reduce((a, b) => a + b, 0) / pnls.length : 0;
    
    return {
      totalRuns: runs.length,
      totalPicks: allEntries.length,
      wins,
      losses,
      pending,
      winRate: parseFloat(winRate.toFixed(1)),
      avgPnl: parseFloat(avgPnl.toFixed(2)),
    };
  }

  // AI Playbook Premium Features Implementation
  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const result = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return result[0];
  }

  async createOrUpdateUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    if (profile.userId) {
      const existing = await this.getUserProfile(profile.userId);
      if (existing) {
        const result = await db.update(userProfiles)
          .set({ ...profile, updatedAt: new Date() })
          .where(eq(userProfiles.userId, profile.userId))
          .returning();
        return result[0];
      }
    }
    const result = await db.insert(userProfiles).values(profile).returning();
    return result[0];
  }

  async checkPremiumStatus(userId: string): Promise<boolean> {
    const profile = await this.getUserProfile(userId);
    if (!profile) return false;
    if (profile.subscriptionStatus !== 'active') return false;
    if (profile.subscriptionPeriodEnd && new Date(profile.subscriptionPeriodEnd) < new Date()) return false;
    return true;
  }

  async updateSubscriptionStatus(userId: string, status: string, subscriptionId?: string, periodEnd?: Date): Promise<void> {
    await db.update(userProfiles)
      .set({
        subscriptionStatus: status,
        subscriptionId: subscriptionId || undefined,
        subscriptionPeriodEnd: periodEnd || undefined,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.userId, userId));
  }

  async getUserPortfolio(userId: string): Promise<UserPortfolioItem[]> {
    const result = await db.select().from(userPortfolio).where(eq(userPortfolio.userId, userId));
    return result;
  }

  async addToUserPortfolio(item: InsertUserPortfolio): Promise<UserPortfolioItem> {
    const result = await db.insert(userPortfolio).values(item).returning();
    return result[0];
  }

  async removeFromUserPortfolio(userId: string, ticker: string): Promise<boolean> {
    const result = await db.delete(userPortfolio)
      .where(and(eq(userPortfolio.userId, userId), eq(userPortfolio.ticker, ticker)));
    return true;
  }

  async createPlaybookRun(run: InsertAiPlaybookRun): Promise<AiPlaybookRun> {
    const result = await db.insert(aiPlaybookRuns).values(run).returning();
    return result[0];
  }

  async getPlaybookRun(runId: string): Promise<AiPlaybookRun | undefined> {
    const result = await db.select().from(aiPlaybookRuns).where(eq(aiPlaybookRuns.id, runId));
    return result[0];
  }

  async getLatestPlaybookRun(userId: string, playbookType: string): Promise<AiPlaybookRun | undefined> {
    const result = await db.select()
      .from(aiPlaybookRuns)
      .where(and(
        eq(aiPlaybookRuns.userId, userId),
        eq(aiPlaybookRuns.playbookType, playbookType),
        eq(aiPlaybookRuns.status, 'completed')
      ))
      .orderBy(desc(aiPlaybookRuns.generatedAt))
      .limit(1);
    return result[0];
  }

  async updatePlaybookRunStatus(runId: string, status: string): Promise<void> {
    await db.update(aiPlaybookRuns)
      .set({
        status,
        completedAt: status === 'completed' ? new Date() : undefined,
      })
      .where(eq(aiPlaybookRuns.id, runId));
  }

  async savePlaybookSections(sections: InsertPlaybookSection[]): Promise<PlaybookSection[]> {
    if (sections.length === 0) return [];
    const result = await db.insert(playbookSections).values(sections).returning();
    return result;
  }

  async getPlaybookSections(runId: string): Promise<PlaybookSection[]> {
    const result = await db.select().from(playbookSections).where(eq(playbookSections.runId, runId));
    return result;
  }

  async getCachedMetric(metricType: string, ticker?: string): Promise<CachedMarketMetric | undefined> {
    const now = new Date();
    let result;
    if (ticker) {
      result = await db.select()
        .from(cachedMarketMetrics)
        .where(and(
          eq(cachedMarketMetrics.metricType, metricType),
          eq(cachedMarketMetrics.ticker, ticker),
          gt(cachedMarketMetrics.expiresAt, now)
        ))
        .orderBy(desc(cachedMarketMetrics.cachedAt))
        .limit(1);
    } else {
      result = await db.select()
        .from(cachedMarketMetrics)
        .where(and(
          eq(cachedMarketMetrics.metricType, metricType),
          gt(cachedMarketMetrics.expiresAt, now)
        ))
        .orderBy(desc(cachedMarketMetrics.cachedAt))
        .limit(1);
    }
    return result[0];
  }

  async saveMarketMetric(metric: InsertCachedMarketMetric): Promise<CachedMarketMetric> {
    const result = await db.insert(cachedMarketMetrics).values(metric).returning();
    return result[0];
  }
}

export const storage = new MemStorage();

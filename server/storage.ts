import { type User, type InsertUser, type Prediction, type InsertPrediction, type WatchlistItem, type InsertWatchlist, type AffiliateClick, type InsertAffiliateClick, type WeeklyRecommendation, type InsertWeeklyRecommendation, predictions } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { sql, eq } from "drizzle-orm";

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
}

export const storage = new MemStorage();

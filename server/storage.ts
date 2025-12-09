import { type User, type InsertUser, type Prediction, type InsertPrediction, type WatchlistItem, type InsertWatchlist } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createPrediction(prediction: InsertPrediction): Promise<Prediction>;
  getPredictions(): Promise<Prediction[]>;
  updatePredictionOutcome(id: string, outcome: string, outcomePrice: number): Promise<Prediction | undefined>;
  getWatchlist(): Promise<WatchlistItem[]>;
  addToWatchlist(item: InsertWatchlist): Promise<WatchlistItem>;
  removeFromWatchlist(ticker: string): Promise<boolean>;
  getStripeProducts(): Promise<any[]>;
  getStripeProductsWithPrices(): Promise<any[]>;
  getStripeSubscription(subscriptionId: string): Promise<any>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private predictions: Map<string, Prediction>;
  private watchlistItems: Map<string, WatchlistItem>;

  constructor() {
    this.users = new Map();
    this.predictions = new Map();
    this.watchlistItems = new Map();
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
    const id = randomUUID();
    const prediction: Prediction = {
      ...insertPrediction,
      id,
      predictionDate: new Date(),
      outcome: null,
      outcomePrice: null,
      outcomeDate: null,
    };
    this.predictions.set(id, prediction);
    return prediction;
  }

  async getPredictions(): Promise<Prediction[]> {
    return Array.from(this.predictions.values()).sort(
      (a, b) => new Date(b.predictionDate).getTime() - new Date(a.predictionDate).getTime()
    );
  }

  async updatePredictionOutcome(id: string, outcome: string, outcomePrice: number): Promise<Prediction | undefined> {
    const prediction = this.predictions.get(id);
    if (!prediction) return undefined;
    
    const updated: Prediction = {
      ...prediction,
      outcome,
      outcomePrice,
      outcomeDate: new Date(),
    };
    this.predictions.set(id, updated);
    return updated;
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
}

export const storage = new MemStorage();

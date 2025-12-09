import { type User, type InsertUser, type Prediction, type InsertPrediction, predictions } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { desc, eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createPrediction(prediction: InsertPrediction): Promise<Prediction>;
  getPredictions(): Promise<Prediction[]>;
  updatePredictionOutcome(id: string, outcome: string, outcomePrice: number): Promise<Prediction | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;

  constructor() {
    this.users = new Map();
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
    const [prediction] = await db.insert(predictions).values(insertPrediction).returning();
    return prediction;
  }

  async getPredictions(): Promise<Prediction[]> {
    return await db.select().from(predictions).orderBy(desc(predictions.predictionDate));
  }

  async updatePredictionOutcome(id: string, outcome: string, outcomePrice: number): Promise<Prediction | undefined> {
    const [updated] = await db
      .update(predictions)
      .set({ outcome, outcomePrice, outcomeDate: new Date() })
      .where(eq(predictions.id, id))
      .returning();
    return updated;
  }
}

export const storage = new MemStorage();

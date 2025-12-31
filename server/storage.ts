import { 
  users, predictions, dailyPredictionRuns, dailyPredictionEntries, 
  userProfiles, userPortfolio, aiPlaybookRuns, playbookSections, 
  cachedMarketMetrics, aiSignalInsights, aiPredictionScores, aiModelMetrics,
  type User, type InsertUser, type Prediction, type InsertPrediction 
} from "../shared/schema.js"; // Note the path and .js extension
import session from "express-session";
import connectPg from "connect-pg-simple";
import { getPool } from "./db.js";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  sessionStore: session.Store;
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    try {
      // Use getPool() instead of direct pool import for lazy initialization
      this.sessionStore = new PostgresSessionStore({
        pool: getPool(),
        createTableIfMissing: true,
        tableName: "session",
      });
    } catch (err) {
      console.error("Failed to initialize session store:", err);
      // Don't throw - allow server to start even if session store fails
      // Fallback to memory store for emergency
      // For now, we'll let the caller handle fallback in index.ts
      throw err; // Let index.ts handle the fallback
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    try {
      const res = await getPool().query("SELECT * FROM users WHERE id = $1", [id]);
      return res.rows[0];
    } catch (err) {
      console.error("Database error in getUser:", err);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const res = await getPool().query("SELECT * FROM users WHERE email = $1", [email]);
      return res.rows[0];
    } catch (err) {
      console.error("Database error in getUserByEmail:", err);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = crypto.randomUUID();
    const res = await getPool().query(
      "INSERT INTO users (id, email, password, is_premium) VALUES ($1, $2, $3, $4) RETURNING *",
      [id, insertUser.email, insertUser.password, insertUser.is_premium ?? false]
    );
    return res.rows[0];
  }
}

// Lazy initialization - only create when accessed
let storageInstance: DatabaseStorage | null = null;

export function getStorage(): DatabaseStorage {
  if (!storageInstance) {
    storageInstance = new DatabaseStorage();
  }
  return storageInstance;
}

// Export for backward compatibility
export const storage = new Proxy({} as DatabaseStorage, {
  get(_target, prop) {
    return getStorage()[prop as keyof DatabaseStorage];
  }
});

import { 
  users, predictions, dailyPredictionRuns, dailyPredictionEntries, 
  userProfiles, userPortfolio, aiPlaybookRuns, playbookSections, 
  cachedMarketMetrics, aiSignalInsights, aiPredictionScores, aiModelMetrics,
  type User, type InsertUser, type Prediction, type InsertPrediction 
} from "../shared/schema.js"; // Note the path and .js extension
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db.js";

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
      this.sessionStore = new PostgresSessionStore({
        pool,
        createTableIfMissing: true,
        tableName: "session",
      });
    } catch (err) {
      console.error("Failed to initialize session store:", err);
      throw err;
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    const res = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    return res.rows[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const res = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    return res.rows[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = crypto.randomUUID();
    const res = await pool.query(
      "INSERT INTO users (id, email, password, is_premium) VALUES ($1, $2, $3, $4) RETURNING *",
      [id, insertUser.email, insertUser.password, insertUser.is_premium ?? false]
    );
    return res.rows[0];
  }
}

export const storage = new DatabaseStorage();
import session from "express-session";
import connectPg from "connect-pg-simple";
import { getPool } from "./db.js";

const PostgresSessionStore = connectPg(session);

// Member type matching the members table schema (Snowy Dawn)
export type Member = {
  id: number;
  email: string;
  password_hash: string;
  membership_tier: string;
  created_at?: Date | string;
};

// Prediction type matching the predictions table schema
export type Prediction = {
  id: string;
  ticker: string;
  signalType: string;
  entryPrice: number;
  predictionDate: Date | string;
  outcome?: string | null;
  outcomePrice?: number | null;
  outcomeDate?: Date | string | null;
  assetType: string;
  openPrice?: number | null;
  predictedPrice?: number | null;
  rsi?: number | null;
  rvol?: number | null;
  sector?: string | null;
  confidence?: string | null;
  reasoning?: string | null;
  openPriceLockedAt?: Date | string | null;
  openPriceSource?: string | null;
  prevClose?: number | null;
};

export interface IStorage {
  sessionStore: session.Store;
  getUser(id: number): Promise<Member | undefined>;
  getUserByEmail(email: string): Promise<Member | undefined>;
  createUser(email: string, passwordHash: string): Promise<Member>;
  // Prediction methods - query predictions table directly
  getPredictions(limit?: number, offset?: number): Promise<Prediction[]>;
  getPredictionsByDate(date: string): Promise<Prediction[]>;
  getPredictionsByOutcome(outcome: string): Promise<Prediction[]>;
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
      // For now, we'll let the caller handle fallback in index.ts
      throw err; // Let index.ts handle the fallback
    }
  }

  // Query members table using id column
  async getUser(id: number): Promise<Member | undefined> {
    try {
      const res = await getPool().query("SELECT * FROM members WHERE id = $1", [id]);
      return res.rows[0];
    } catch (err) {
      console.error("Database error in getUser:", err);
      return undefined;
    }
  }

  // Query members table using email column (identity column)
  async getUserByEmail(email: string): Promise<Member | undefined> {
    try {
      const res = await getPool().query("SELECT * FROM members WHERE email = $1", [email]);
      return res.rows[0];
    } catch (err) {
      console.error("Database error in getUserByEmail:", err);
      return undefined;
    }
  }

  // Insert into members table with password_hash column (required NOT NULL constraint)
  async createUser(email: string, passwordHash: string): Promise<Member> {
    const res = await getPool().query(
      "INSERT INTO members (email, password_hash, membership_tier) VALUES ($1, $2, 'FREE') RETURNING *",
      [email, passwordHash]
    );
    return res.rows[0];
  }

  // ============================================
  // PREDICTION METHODS - Query predictions table directly
  // ============================================

  /**
   * Get all predictions from the predictions table (not daily_prediction_entries)
   * Maps columns to match frontend expectations
   */
  async getPredictions(limit: number = 100, offset: number = 0): Promise<Prediction[]> {
    try {
      const res = await getPool().query(
        `SELECT * FROM predictions 
         ORDER BY prediction_date DESC 
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      
      return res.rows.map(this.mapPredictionRow);
    } catch (err) {
      console.error("Database error in getPredictions:", err);
      return [];
    }
  }

  /**
   * Get predictions by date from predictions table
   * Maps columns to match frontend expectations
   */
  async getPredictionsByDate(date: string): Promise<Prediction[]> {
    try {
      const res = await getPool().query(
        `SELECT * FROM predictions 
         WHERE DATE(prediction_date) = $1 
         ORDER BY prediction_date DESC`,
        [date]
      );
      
      return res.rows.map(this.mapPredictionRow);
    } catch (err) {
      console.error("Database error in getPredictionsByDate:", err);
      return [];
    }
  }

  /**
   * Get predictions by outcome from predictions table
   * Maps columns to match frontend expectations
   */
  async getPredictionsByOutcome(outcome: string): Promise<Prediction[]> {
    try {
      const res = await getPool().query(
        `SELECT * FROM predictions 
         WHERE outcome = $1 
         ORDER BY prediction_date DESC`,
        [outcome]
      );
      
      return res.rows.map(this.mapPredictionRow);
    } catch (err) {
      console.error("Database error in getPredictionsByOutcome:", err);
      return [];
    }
  }

  /**
   * Map prediction row from database to frontend-expected format
   * Handles column name differences between predictions and daily_prediction_entries
   * Maps title to ticker if needed, and handles all column variations
   */
  private mapPredictionRow(row: any): any {
    // Handle title column - if predictions table uses 'title' instead of 'ticker', map it
    const ticker = row.ticker || row.title || row.symbol || '';
    
    return {
      // Core fields - direct mapping with fallbacks
      id: row.id,
      ticker: ticker, // Use ticker, fallback to title if needed
      title: row.title || ticker, // Include title if it exists
      entryPrice: Number(row.entry_price || row.entryPrice) || 0,
      openPrice: row.open_price || row.openPrice ? Number(row.open_price || row.openPrice) : null,
      predictedPrice: row.predicted_price || row.predictedPrice ? Number(row.predicted_price || row.predictedPrice) : null,
      signal: row.signal_type || row.signal || 'BUY', // Map signalType to signal for frontend
      signalType: row.signal_type || row.signal || 'BUY',
      outcome: row.outcome || null,
      outcomePrice: row.outcome_price || row.outcomePrice ? Number(row.outcome_price || row.outcomePrice) : null,
      outcomeDate: row.outcome_date || row.outcomeDate || null,
      predictionDate: row.prediction_date || row.predictionDate || row.created_at || new Date(),
      
      // Additional fields
      rsi: row.rsi ? Number(row.rsi) : null,
      rvol: row.rvol ? Number(row.rvol) : null,
      sector: row.sector || null,
      confidence: row.confidence || null,
      reasoning: row.reasoning || null,
      assetType: row.asset_type || row.assetType || 'stock',
      prevClose: row.prev_close || row.prevClose ? Number(row.prev_close || row.prevClose) : null,
      
      // Frontend compatibility - map confidence to confidenceScore if needed
      confidenceScore: row.confidence_score || row.confidenceScore 
        ? Number(row.confidence_score || row.confidenceScore) 
        : (row.confidence ? parseFloat(row.confidence) || 0 : 0),
      
      // Calculate closePrice and currentPrice from outcomePrice if available
      closePrice: row.close_price || row.closePrice 
        ? Number(row.close_price || row.closePrice) 
        : (row.outcome_price || row.outcomePrice ? Number(row.outcome_price || row.outcomePrice) : null),
      currentPrice: row.current_price || row.currentPrice 
        ? Number(row.current_price || row.currentPrice) 
        : (row.outcome_price || row.outcomePrice ? Number(row.outcome_price || row.outcomePrice) : null),
      
      // Calculate P/L if we have the necessary data
      closePnl: (row.close_pnl || row.closePnl) 
        ? Number(row.close_pnl || row.closePnl)
        : (row.open_price && row.outcome_price 
          ? ((Number(row.outcome_price) - Number(row.open_price)) / Number(row.open_price)) * 100 
          : null),
      totalPnl: (row.total_pnl || row.totalPnl)
        ? Number(row.total_pnl || row.totalPnl)
        : (row.open_price && row.outcome_price 
          ? ((Number(row.outcome_price) - Number(row.open_price)) / Number(row.open_price)) * 100 
          : null),
    };
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

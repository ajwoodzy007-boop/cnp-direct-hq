import session from "express-session";
import connectPg from "connect-pg-simple";
import { getPool } from "./db.js";

const PostgresSessionStore = connectPg(session);

// Member type matching the members table schema
export type Member = {
  id: number;
  email: string;
  password_hash: string;
  membership_tier: string;
  created_at?: Date | string;
};

export interface IStorage {
  sessionStore: session.Store;
  getUser(id: number): Promise<Member | undefined>;
  getUserByEmail(email: string): Promise<Member | undefined>;
  createUser(email: string, passwordHash: string): Promise<Member>;
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

  async getUser(id: number): Promise<Member | undefined> {
    try {
      const res = await getPool().query("SELECT * FROM members WHERE id = $1", [id]);
      return res.rows[0];
    } catch (err) {
      console.error("Database error in getUser:", err);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<Member | undefined> {
    try {
      const res = await getPool().query("SELECT * FROM members WHERE email = $1", [email]);
      return res.rows[0];
    } catch (err) {
      console.error("Database error in getUserByEmail:", err);
      return undefined;
    }
  }

  async createUser(email: string, passwordHash: string): Promise<Member> {
    const res = await getPool().query(
      "INSERT INTO members (email, password_hash, membership_tier) VALUES ($1, $2, 'FREE') RETURNING *",
      [email, passwordHash]
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

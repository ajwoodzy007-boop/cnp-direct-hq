import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';

dotenv.config();

// Lazy pool creation - only creates connection when actually used
let poolInstance: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!poolInstance) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL must be set");
    }
    poolInstance = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Don't fail on connection errors immediately
      connectionTimeoutMillis: 5000,
    });
  }
  return poolInstance;
}

// Export pool for backward compatibility (lazy)
export const pool = new Proxy({} as pg.Pool, {
  get(_target, prop) {
    return getPool()[prop as keyof pg.Pool];
  }
});

export const query = (text: string, params?: any[]) => getPool().query(text, params);

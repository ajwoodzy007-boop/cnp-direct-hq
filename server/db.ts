import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
});

export const db = drizzle(pool, { schema });

export async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS portfolio (
        id TEXT PRIMARY KEY,
        "userId" INTEGER,
        ticker TEXT NOT NULL,
        type TEXT NOT NULL,
        "entryPrice" REAL NOT NULL, 
        shares REAL NOT NULL,
        "dateOpened" TEXT NOT NULL,
        status TEXT DEFAULT 'OPEN',
        "strikePrice" REAL,
        "expirationDate" TEXT,
        "contractSymbol" TEXT
      );
    `);
    
    await client.query(`
      ALTER TABLE portfolio ADD COLUMN IF NOT EXISTS "strikePrice" REAL;
    `).catch(() => {});
    await client.query(`
      ALTER TABLE portfolio ADD COLUMN IF NOT EXISTS "expirationDate" TEXT;
    `).catch(() => {});
    await client.query(`
      ALTER TABLE portfolio ADD COLUMN IF NOT EXISTS "contractSymbol" TEXT;
    `).catch(() => {});

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        tier TEXT DEFAULT 'FREE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log("🗄️  Database Ready: Options Support Active.");
  } catch (err) {
    console.error("DB Init Error:", err);
  } finally {
    client.release();
  }
}

export const query = (text: string, params?: any[]) => pool.query(text, params);

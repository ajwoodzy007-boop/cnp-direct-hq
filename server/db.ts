import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// This is required for Neon to work in a Node.js environment like Railway
neonConfig.webSocketConstructor = ws;

// Use NEON_DATABASE_URL if available, otherwise fallback to DATABASE_URL
const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing. Sentinel Intelligence offline.");
}

export const pool = new Pool({ 
  connectionString,
});

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('[Database] Query executed', { text, duration, rows: res.rowCount });
    return res.rows;
  } catch (err) {
    console.error('[Database] Connection Error:', err);
    throw err;
  }
};

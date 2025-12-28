import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Required for Neon to operate in a Node.js environment like Railway
neonConfig.webSocketConstructor = ws;

// Prioritize the NEON_DATABASE_URL you confirmed in your variables
const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing. Sentinel Intelligence offline.");
}

export const pool = new Pool({ 
  connectionString,
  // Force SSL to true to satisfy the 'sslmode=require' in your URL
  ssl: true 
});

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('[Database] Query executed', { text, duration, rows: res.rowCount });
    return res.rows;
  } catch (err: any) {
    console.error('[Database] Connection Error:', err.message);
    throw err;
  }
};

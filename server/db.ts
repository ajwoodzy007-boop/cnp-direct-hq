import { neon, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Required for Neon serverless in a Node environment
neonConfig.webSocketConstructor = ws;

// We check NEON_DATABASE_URL first, then fallback to DATABASE_URL
const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL or NEON_DATABASE_URL is missing in Railway variables.");
}

const sql = neon(connectionString);

/**
 * Global Query Helper
 * Aligned with the mass-fix for Sentinel OS [cite: 2025-12-16]
 */
export const query = async (text: string, params: any[] = []) => {
  try {
    const start = Date.now();
    const rows = await sql(text, params);
    const duration = Date.now() - start;
    
    // Log queries in dev/production for debugging login loops
    console.log(`[DB Query] Executed in ${duration}ms`);
    return rows;
  } catch (err) {
    console.error('[Database Error]:', err);
    throw err;
  }
};

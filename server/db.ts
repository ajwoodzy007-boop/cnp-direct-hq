import { neon, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing.");
}

// Using the direct SQL driver for better stability on Railway
const sql = neon(connectionString);

export const query = async (text: string, params: any[] = []) => {
  const start = Date.now();
  try {
    // Replace $1, $2 with Neon's expected format if necessary, 
    // but the driver handles standard arrays well.
    const rows = await sql(text, params);
    console.log('[Database] Query successful', { duration: Date.now() - start });
    return rows;
  } catch (err) {
    console.error('[Database] CRITICAL_ERROR:', err);
    throw err;
  }
};

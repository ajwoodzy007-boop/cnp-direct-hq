import { neon, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing.");
}

const sql = neon(connectionString);

export const query = async (text: string, params: any[] = []) => {
  try {
    const rows = await sql(text, params);
    return rows;
  } catch (err) {
    console.error('[Database] Query Error:', err);
    throw err;
  }
};

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from "../shared/schema";
import * as dotenv from "dotenv"; // 1. Import dotenv
import { resolve } from "path";

// 2. Load the .env file from the root directory
dotenv.config({ path: resolve(process.cwd(), ".env") });

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  // This will now only throw if the .env file is missing or the key is wrong
  throw new Error("DATABASE_URL must be set");
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
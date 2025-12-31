import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';

dotenv.config();

async function ensureSessionTable() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set");
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await pool.query('SELECT NOW()');
    console.log("🔗 Connected to database");

    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'session'
      );
    `);

    if (tableCheck.rows[0].exists) {
      console.log("✅ Session table already exists");
      return;
    }

    console.log("📋 Creating session table...");

    // Create the session table with the structure expected by connect-pg-simple
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL
      ) WITH (OIDS=FALSE);
    `);

    await pool.query(`
      ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
    `);

    console.log("✅ Session table created successfully!");

  } catch (err: any) {
    console.error("❌ ERROR:", err.message);
    throw err;
  } finally {
    await pool.end();
  }
}

ensureSessionTable()
  .then(() => {
    console.log("🎯 Session table setup complete!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("💥 Failed to setup session table:", err);
    process.exit(1);
  });


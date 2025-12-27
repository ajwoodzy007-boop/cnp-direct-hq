import pg from 'pg';
const { Pool } = pg;

// 1. Connection Configuration
// Railway automatically provides the DATABASE_URL environment variable
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 2. Query Helper Function
// This centralizes database calls and error logging
export const query = async (text: string, params?: any[]) => {
  try {
    const res = await pool.query(text, params);
    return res.rows;
  } catch (err) {
    console.error("[DB Error] Query failed:", err);
    throw err;
  }
};

// 3. Self-Healing Schema Logic
// This ensures your 'users' table is always ready with the correct columns
(async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        is_premium BOOLEAN DEFAULT TRUE,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("[DB] Users table verified and ready.");
  } catch (err) {
    console.error("[DB] Table setup failed:", err);
  }
})();

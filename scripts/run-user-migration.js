import { db } from '../server/db.js';
import { sql } from 'drizzle-orm';

async function runMigration() {
  console.log('🚀 Running User & Portfolio Tables Migration...');

  try {
    // Create users table
    console.log('📋 Creating users table...');
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        full_name TEXT,
        email TEXT UNIQUE NOT NULL,
        phone_number TEXT,
        address TEXT,
        password_hash TEXT NOT NULL,
        subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium')),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;

    // Create portfolios table
    console.log('📋 Creating portfolios table...');
    await sql`
      CREATE TABLE IF NOT EXISTS portfolios (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        ticker_symbol TEXT NOT NULL,
        added_at TIMESTAMP DEFAULT NOW()
      );
    `;

    // Add unique constraint and index
    console.log('📋 Adding constraints and indexes...');
    await sql`
      ALTER TABLE portfolios
      ADD CONSTRAINT IF NOT EXISTS portfolios_user_ticker_unique
      UNIQUE (user_id, ticker_symbol);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_portfolios_ticker ON portfolios(ticker_symbol);
    `;

    console.log('✅ Migration completed successfully!');
    console.log('📊 Tables created: users, portfolios');
    console.log('🔗 Constraints added: unique user+ticker, indexes on user_id and ticker_symbol');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

runMigration();

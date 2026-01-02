-- Create users table for personal profiles
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

-- Create portfolios table for personal watchlists
CREATE TABLE IF NOT EXISTS portfolios (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ticker_symbol TEXT NOT NULL,
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, ticker_symbol) -- Prevent duplicate tickers per user
);

-- Create index for faster portfolio queries
CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_ticker ON portfolios(ticker_symbol);

-- Insert default admin user if not exists
INSERT INTO users (email, password_hash, subscription_tier, full_name)
VALUES ('admin@cnpdirect.com', '$2b$10$dummy.hash.for.migration', 'premium', 'Administrator')
ON CONFLICT (email) DO NOTHING;

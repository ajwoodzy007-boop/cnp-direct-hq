import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_9BaMpmY8rSgq@ep-snowy-dawn-aekdq8m2.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require'
});

async function setupDatabase() {
  try {
    await client.connect();
    console.log('✅ Connected to Snowy Dawn database');

    // Create members table
    await client.query(`
      CREATE TABLE IF NOT EXISTS members (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        membership_tier TEXT DEFAULT 'free' NOT NULL,
        is_premium BOOLEAN DEFAULT false NOT NULL,
        is_admin BOOLEAN DEFAULT false NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log('✅ Members table created');

    // Create historical_prices table
    await client.query(`
      CREATE TABLE IF NOT EXISTS historical_prices (
        id SERIAL PRIMARY KEY,
        ticker VARCHAR(10) NOT NULL,
        close_price TEXT NOT NULL,
        date TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log('✅ Historical prices table created');

    // Create predictions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS predictions (
        id SERIAL PRIMARY KEY,
        symbol TEXT NOT NULL,
        prediction TEXT NOT NULL,
        confidence INTEGER NOT NULL,
        target_price DECIMAL(10,2),
        timeframe TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Predictions table created');

    // Insert admin user
    await client.query(`
      INSERT INTO members (email, password_hash, membership_tier, is_admin, is_premium)
      VALUES ('ajwoodzy007@gmail.com', 'admin_bypass', 'admin', true, true)
      ON CONFLICT (email) DO UPDATE SET
        membership_tier = 'admin',
        is_admin = true,
        is_premium = true
    `);
    console.log('✅ Admin user added/updated');

    // Verify
    const result = await client.query('SELECT * FROM members WHERE email = $1', ['ajwoodzy007@gmail.com']);
    console.log('🎯 Admin user details:', result.rows[0]);

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

setupDatabase();

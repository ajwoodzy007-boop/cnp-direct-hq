const { Client } = require('pg');

async function seedAdmin() {
    // Snowy Dawn Connection
    const connectionString = "postgresql://neondb_owner:npg_9BaMpmY8rSgq@ep-snowy-dawn-aekdq8m2.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require";
    const client = new Client(connectionString);

    try {
        await client.connect();
        console.log("🔗 Connected to Snowy Dawn Database...");

        const email = 'ajwoodzy007@gmail.com';
        // A placeholder hash to satisfy the NOT NULL constraint
        const dummyHash = 'bypass_active'; 

        const res = await client.query(`
            INSERT INTO members (email, password_hash, membership_tier)
            VALUES ($1, $2, 'admin')
            ON CONFLICT (email) 
            DO UPDATE SET 
                membership_tier = 'admin',
                password_hash = EXCLUDED.password_hash
            RETURNING *;
        `, [email, dummyHash]);

        console.log("-----------------------------------------");
        console.log(`✅ SUCCESS: ${res.rows[0].email} is now an Admin.`);
        console.log(`Tier: ${res.rows[0].membership_tier}`);
        console.log("-----------------------------------------");

    } catch (err) {
        console.error("❌ ERROR:", err.message);
        
        // If it still fails, let's see what the table actually looks like
        console.log("\nChecking table structure...");
        const columns = await client.query(`
            SELECT column_name, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'members'
        `);
        console.table(columns.rows);
    } finally {
        await client.end();
    }
}

seedAdmin();
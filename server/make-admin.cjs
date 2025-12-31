const { Client } = require('pg');

async function makeAdmin() {
    // Connection string for your 117-row database
    const connectionString = "postgresql://neondb_owner:npg_RgsUuBVyA57z@ep-withered-cloud-aepmhqdn.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require";
    const client = new Client(connectionString);

    try {
        await client.connect();
        console.log("🔗 Connected to Database...");

        // We will try to update by both email and username formats
        const targetEmail = 'ajwoodzy007@gmail.com';
        const targetUser = 'ajwoodzy007';

        const res = await client.query(`
            UPDATE users 
            SET "isAdmin" = true, 
                "status" = 'active', 
                "isRevoked" = false 
            WHERE username = $1 OR username = $2
            RETURNING id, username, "isAdmin";
        `, [targetEmail, targetUser]);

        if (res.rowCount > 0) {
            console.log("-----------------------------------------");
            console.log(`✅ SUCCESS: ${res.rows[0].username} IS NOW MASTER ADMIN.`);
            console.log("-----------------------------------------");
        } else {
            console.log("❓ Target not found. Listing all available users to help you identify the right one:");
            const allUsers = await client.query('SELECT id, username, "isAdmin", status FROM users LIMIT 10');
            console.table(allUsers.rows);
        }

    } catch (err) {
        console.error("❌ ERROR:", err.message);
    } finally {
        await client.end();
    }
}

makeAdmin();
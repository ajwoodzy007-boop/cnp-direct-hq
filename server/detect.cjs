const { Client } = require('pg');

async function detect() {
    const snowyDawn = "postgresql://neondb_owner:npg_9BaMpmY8rSgq@ep-snowy-dawn-aekdq8m2.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require";
    const client = new Client(snowyDawn);

    try {
        await client.connect();
        console.log("🔍 Scanning Snowy Dawn for hidden data...");

        const tablesRes = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        
        for (const row of tablesRes.rows) {
            const tableName = row.table_name;
            const countRes = await client.query(`SELECT count(*) FROM "${tableName}"`).catch(() => ({ rows: [{ count: 'Error' }] }));
            console.log(`📍 Table: ${tableName} | Rows: ${countRes.rows[0].count}`);
        }

    } catch (err) {
        console.error("❌ ERROR:", err.message);
    } finally {
        await client.end();
    }
}

detect();
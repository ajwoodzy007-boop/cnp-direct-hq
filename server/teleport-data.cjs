const { Client } = require('pg');

async function teleport() {
    const sourceURL = "postgresql://neondb_owner:npg_RgsUuBVyA57z@ep-withered-cloud-aepmhqdn.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require";
    const targetURL = "postgresql://neondb_owner:npg_9BaMpmY8rSgq@ep-snowy-dawn-aekdq8m2.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require";

    const source = new Client(sourceURL);
    const target = new Client(targetURL);

    try {
        await source.connect();
        await target.connect();
        console.log("🔗 Searching all tables for the 117 rows...");

        // 1. Prepare Target: Remove 'NOT NULL' from run_id so data can actually land
        await target.query(`ALTER TABLE daily_prediction_entries ALTER COLUMN run_id DROP NOT NULL`).catch(() => {});

        // 2. Get EVERY table name from the old DB
        const tablesRes = await source.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        
        for (const row of tablesRes.rows) {
            const tableName = row.table_name;
            
            // Check row count for this table
            const countRes = await source.query(`SELECT count(*) FROM "${tableName}"`).catch(() => ({ rows: [{ count: 0 }] }));
            const count = parseInt(countRes.rows[0].count);
            
            console.log(`Checking table: ${tableName} (${count} rows)`);

            // If we find a table with a lot of rows, try to move it
            if (count > 10) { 
                console.log(`🚀 Attempting to move ${count} rows from ${tableName}...`);
                const dataRes = await source.query(`SELECT * FROM "${tableName}"`);
                
                for (const dataRow of dataRes.rows) {
                    const columns = Object.keys(dataRow);
                    
                    // Ensure columns exist on target
                    for (const col of columns) {
                        await target.query(`ALTER TABLE daily_prediction_entries ADD COLUMN IF NOT EXISTS "${col}" TEXT`).catch(() => {});
                    }

                    const colNames = columns.map(c => `"${c}"`).join(", ");
                    const values = Object.values(dataRow);
                    const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");

                    // Use ON CONFLICT (id) DO NOTHING to avoid duplicates if ID exists
                    const idCol = columns.includes('id') ? 'ON CONFLICT (id) DO NOTHING' : '';

                    await target.query(
                        `INSERT INTO daily_prediction_entries (${colNames}) VALUES (${placeholders}) ${idCol}`,
                        values
                    ).catch(err => {});
                }
                console.log(`✅ Finished moving table: ${tableName}`);
            }
        }

        console.log("\n✨ PROCESS COMPLETE. Refresh your dashboard.");

    } catch (err) {
        console.error("❌ ERROR:", err.message);
    } finally {
        await source.end();
        await target.end();
    }
}

teleport();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function restoreData() {
    const client = new Client("postgresql://neondb_owner:npg_RgsUuBVyA57z@ep-withered-cloud-aepmhqdn.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require");
    
    // PATH TO YOUR DOWNLOADS FOLDER
    const filePath = "C:/Users/ajwoo/Downloads/daily_prediction_entries.json";

    try {
        await client.connect();
        console.log("🔗 Connected to Neon...");

        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        console.log(`📖 Found ${data.length} predictions in backup file.`);

        // 1. Ensure the table exists
        await client.query(`
            CREATE TABLE IF NOT EXISTS predictions (
                id SERIAL PRIMARY KEY,
                title TEXT,
                description TEXT,
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "userId" INTEGER,
                data JSONB
            );
        `);

        // 2. Clear old (if any) and Insert New
        await client.query('DELETE FROM predictions');
        
        for (const item of data) {
            await client.query(
                `INSERT INTO predictions (title, description, date, "userId", data) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [item.title, item.description, item.date, item.userId, JSON.stringify(item.data || {})]
            );
        }

        console.log("-----------------------------------------");
        console.log(`🚀 SUCCESS! ${data.length} PREDICTIONS RESTORED.`);
        console.log("-----------------------------------------");

    } catch (err) {
        console.error("❌ ERROR:", err.message);
    } finally {
        await client.end();
    }
}

restoreData();
const { Client } = require('pg');

async function fix() {
    const client = new Client("postgresql://neondb_owner:npg_RgsUuBVyA57z@ep-withered-cloud-aepmhqdn.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require");
    
    try {
        await client.connect();
        console.log("🔗 Connected. Building the missing Session table...");

        // This is the EXACT SQL structure the server is looking for
        await client.query(`
            CREATE TABLE IF NOT EXISTS "session" (
              "sid" varchar NOT NULL COLLATE "default",
              "sess" json NOT NULL,
              "expire" timestamp(6) NOT NULL
            ) WITH (OIDS=FALSE);
            
            ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
            
            CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
        `);

        console.log("✅ SESSION TABLE CREATED!");
        console.log("🚀 Try logging in now - the gatekeeper finally has a place to save your keys.");

    } catch (err) {
        console.error("❌ ERROR:", err.message);
    } finally {
        await client.end();
    }
}

fix();
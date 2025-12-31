const { Client } = require('pg');

async function fixSessions() {
    const connectionString = "postgresql://neondb_owner:npg_9BaMpmY8rSgq@ep-snowy-dawn-aekdq8m2.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require";
    const client = new Client(connectionString);

    try {
        await client.connect();
        console.log("🔗 Connected to Snowy Dawn...");

        // Create the session table required by connect-pg-simple
        await client.query(`
            CREATE TABLE IF NOT EXISTS "session" (
              "sid" varchar NOT NULL COLLATE "default",
              "sess" json NOT NULL,
              "expire" timestamp(6) NOT NULL
            ) WITH (OIDS=FALSE);
            
            ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
            CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
        `);

        console.log("✅ Session table created/verified!");
    } catch (err) {
        console.log("Note: Session table might already exist, which is fine.");
    } finally {
        await client.end();
    }
}

fixSessions();
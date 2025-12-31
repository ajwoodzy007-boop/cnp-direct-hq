const { Client } = require('pg');
const crypto = require('crypto');
const { promisify } = require('util');

const scryptAsync = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

async function fix() {
    const client = new Client("postgresql://neondb_owner:npg_RgsUuBVyA57z@ep-withered-cloud-aepmhqdn.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require");
    try {
        await client.connect();
        const hashedPassword = await hashPassword('admin123');
        
        await client.query(`
            UPDATE users 
            SET password = $1, role = 'admin', "isAdmin" = true 
            WHERE email = 'admin@cnpdirect.com'
        `, [hashedPassword]);

        console.log("-----------------------------------------");
        console.log("✅ PASSWORD ENCRYPTED SUCCESSFULLY");
        console.log("User: admin@cnpdirect.com");
        console.log("Pass: admin123");
        console.log("-----------------------------------------");
    } catch (err) {
        console.error(err.message);
    } finally {
        await client.end();
    }
}
fix();
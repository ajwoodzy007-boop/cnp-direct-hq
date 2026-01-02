import { db } from "../../db";
import { members } from "../../drizzle/schema";

async function checkUsers() {
  try {
    console.log("🔍 Checking users in database...");

    const allUsers = await db.select().from(members);

    console.log(`📋 Found ${allUsers.length} users:`);

    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Membership Tier: ${user.membershipTier}`);
      console.log(`   Is Admin: ${user.isAdmin}`);
      console.log(`   Password Hash: ${user.passwordHash ? user.passwordHash.substring(0, 20) + '...' : 'NULL'}`);
      console.log('   ---');
    });

    // Specifically check for the admin user
    const adminUser = allUsers.find(u => u.email === 'ajwoodzy007@gmail.com');
    if (adminUser) {
      console.log("✅ Admin user found:");
      console.log(`   Email: ${adminUser.email}`);
      console.log(`   Is Admin: ${adminUser.isAdmin}`);
      console.log(`   Membership Tier: ${adminUser.membershipTier}`);
    } else {
      console.log("❌ Admin user 'ajwoodzy007@gmail.com' not found in database");
    }

  } catch (error) {
    console.error("❌ Error checking users:", error);
  } finally {
    process.exit(0);
  }
}

checkUsers();

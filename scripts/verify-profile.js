import { db } from '../server/db.js';
import { users } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

/**
 * Profile Success Verification Script
 * Run this after profile updates to verify data integrity
 */

async function verifyProfile() {
  console.log('🔍 Starting Profile Verification...');

  try {
    // Check total user count
    const totalUsers = await db.$count(users);
    console.log(`👥 Total users in database: ${totalUsers}`);

    if (totalUsers === 0) {
      console.log('❌ No users found in database');
      return;
    }

    // Get all users (without sensitive data)
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        full_name: users.full_name,
        phone_number: users.phone_number,
        address: users.address,
        subscription_tier: users.subscription_tier,
        is_admin: users.is_admin,
        created_at: users.created_at,
        updated_at: users.updated_at
      })
      .from(users);

    console.log('\n📋 User Profiles:');
    allUsers.forEach((user, index) => {
      console.log(`\n${index + 1}. User ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.full_name || 'Not set'}`);
      console.log(`   Phone: ${user.phone_number || 'Not set'}`);
      console.log(`   Address: ${user.address || 'Not set'}`);
      console.log(`   Tier: ${user.subscription_tier}`);
      console.log(`   Admin: ${user.is_admin}`);
      console.log(`   Created: ${user.created_at}`);
      console.log(`   Updated: ${user.updated_at}`);
    });

    // Check for recent updates (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentlyUpdated = allUsers.filter(user =>
      user.updated_at && new Date(user.updated_at) > yesterday
    );

    if (recentlyUpdated.length > 0) {
      console.log(`\n✅ Recent Updates (${recentlyUpdated.length}):`);
      recentlyUpdated.forEach(user => {
        const timeAgo = Math.round((Date.now() - new Date(user.updated_at).getTime()) / (1000 * 60));
        console.log(`   ${user.email} - Updated ${timeAgo} minutes ago`);
      });
    } else {
      console.log('\n⚠️  No recent profile updates in the last 24 hours');
    }

    // Check data completeness
    const completeProfiles = allUsers.filter(user =>
      user.full_name && user.phone_number && user.address
    );

    console.log(`\n📊 Profile Completeness:`);
    console.log(`   Complete profiles: ${completeProfiles.length}/${totalUsers}`);
    console.log(`   Missing data: ${totalUsers - completeProfiles.length} users`);

    if (completeProfiles.length > 0) {
      console.log('🎉 Profile system is working correctly!');
    } else {
      console.log('⚠️  All profiles are missing data - check update functionality');
    }

  } catch (error) {
    console.error('❌ Profile verification failed:', error);
  }
}

// Run the verification
verifyProfile()
  .then(() => {
    console.log('\n🏁 Profile verification complete');
  })
  .catch((error) => {
    console.error('💥 Verification script failed:', error);
  });

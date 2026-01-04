import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function migrateDatabase(): Promise<void> {
  console.log('🗃️ Starting Database Migration...');
  console.log('📋 Adding unique constraints to prevent data duplication');

  try {
    console.log('🔄 Running drizzle-kit push...');

    // Run the database migration
    const { stdout, stderr } = await execAsync('npm run db:push');

    if (stdout) {
      console.log('📤 Migration output:', stdout);
    }

    if (stderr) {
      console.log('⚠️ Migration warnings:', stderr);
    }

    console.log('✅ Database migration completed successfully!');
    console.log('🛡️ Unique constraints now active on predictions and predictions_history tables');

  } catch (error) {
    console.error('❌ Database migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateDatabase()
  .then(() => {
    console.log('🏁 Database migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Database migration script failed:', error);
    process.exit(1);
  });

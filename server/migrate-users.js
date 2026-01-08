/**
 * User Table Migration Script
 * Adds new fields to existing users table
 * Run with: node migrate-users.js
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const db = require('./database/postgis');
const fs = require('fs');

async function migrateUsers() {
  console.log('🔧 Migrating users table to add new fields...\n');

  try {
    // Read and execute the migration SQL file
    console.log('📄 Reading migration SQL file...');
    const sqlFilePath = path.join(__dirname, 'database', 'migrate-users-table.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('🔄 Executing migration...');
    await db.query(sql);
    console.log('✓ Migration completed successfully\n');

    // Show current users
    console.log('👥 Current users in database:');
    const result = await db.query(`
      SELECT id, username, first_name, last_name, email, role, created_at
      FROM users
      ORDER BY id;
    `);

    if (result.rows.length === 0) {
      console.log('   No users found.');
    } else {
      result.rows.forEach(user => {
        console.log(`   - ${user.username} (${user.first_name} ${user.last_name})`);
        console.log(`     Email: ${user.email}`);
        console.log(`     Role: ${user.role}`);
        console.log(`     Created: ${user.created_at}`);
        console.log('');
      });
    }

    console.log('✅ Migration complete!\n');
    console.log('📝 Next steps:');
    console.log('   1. Update existing users with correct information using:');
    console.log('      UPDATE users SET first_name = \'YourName\', last_name = \'YourLastName\', email = \'your@email.com\' WHERE username = \'yourusername\';');
    console.log('   2. Create new users with: node create-user.js\n');

  } catch (error) {
    console.error('❌ Error during migration:', error);
    console.error('   Message:', error.message);
  } finally {
    process.exit(0);
  }
}

migrateUsers();

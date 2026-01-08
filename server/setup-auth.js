/**
 * Authentication Setup Script
 * Creates users table and adds initial admin user
 * Run with: node setup-auth.js
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const bcrypt = require('bcrypt');
const db = require('./database/postgis');
const fs = require('fs');

async function setupAuth() {
  console.log('🔧 Setting up authentication system...\n');

  try {
    // Read and execute the users-setup.sql file
    console.log('📄 Creating users table...');
    const sqlFilePath = path.join(__dirname, 'database', 'users-setup.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');

    // Remove the placeholder INSERT statement
    const sqlWithoutInsert = sql.split('-- Insert a default admin user')[0];

    await db.query(sqlWithoutInsert);
    console.log('✓ Users table created successfully\n');

    // Create default admin user
    console.log('👤 Creating default admin user...');
    const username = 'admin';
    const password = 'admin123';
    const first_name = 'Admin';
    const last_name = 'User';
    const email = 'admin@example.com';
    const role = 'admin';

    // Check if admin user already exists
    const existing = await db.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existing.rows.length > 0) {
      console.log('ℹ️  Admin user already exists\n');
    } else {
      // Hash password
      const saltRounds = 10;
      const password_hash = await bcrypt.hash(password, saltRounds);

      // Insert admin user
      const result = await db.query(
        `INSERT INTO users (username, password_hash, first_name, last_name, email, role)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, username, first_name, last_name, email, role, created_at`,
        [username, password_hash, first_name, last_name, email, role]
      );

      const user = result.rows[0];
      console.log(`✓ Admin user created successfully`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Password: ${password}`);
      console.log(`   Name: ${user.first_name} ${user.last_name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Created: ${user.created_at}\n`);
    }

    console.log('✅ Authentication system setup complete!\n');
    console.log('📝 Next steps:');
    console.log('   1. Start the server: npm start');
    console.log('   2. Login with username: admin, password: admin123');
    console.log('   3. Change the admin password for security\n');

  } catch (error) {
    console.error('❌ Error setting up authentication:', error);
    console.error('   Message:', error.message);
  } finally {
    process.exit(0);
  }
}

setupAuth();

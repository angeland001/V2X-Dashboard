/**
 * User Creation Script
 * Run with: node create-user.js username password
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const bcrypt = require('bcrypt');
const db = require('./database/postgis');

async function createUser(username, password) {
  try {
    // Validate input
    if (!username || !password) {
      console.error('❌ Usage: node create-user.js <username> <password>');
      console.error('   Example: node create-user.js john_doe mypassword123');
      process.exit(1);
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/;
    if (!usernameRegex.test(username)) {
      console.error('❌ Invalid username format');
      console.error('   Username must be 3-50 characters (letters, numbers, underscores only)');
      process.exit(1);
    }

    // Validate password length
    if (password.length < 6) {
      console.error('❌ Password must be at least 6 characters long');
      process.exit(1);
    }

    console.log(`🔧 Creating user '${username}'...`);

    // Check if username already exists
    const existing = await db.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (existing.rows.length > 0) {
      console.error(`❌ User '${username}' already exists`);
      console.error(`   Choose a different username or delete the existing user`);
      process.exit(1);
    }

    // Hash the password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const result = await db.query(
      `INSERT INTO users (username, password_hash)
       VALUES ($1, $2)
       RETURNING id, username, created_at`,
      [username, password_hash]
    );

    const user = result.rows[0];

    console.log('\n✅ User created successfully!');
    console.log(`   Username: ${user.username}`);
    console.log(`   Password: ${password}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Created: ${user.created_at}\n`);

  } catch (error) {
    console.error('❌ Error creating user:', error.message);
  } finally {
    process.exit(0);
  }
}

// Get username and password from command line arguments
const username = process.argv[2];
const password = process.argv[3];

createUser(username, password);

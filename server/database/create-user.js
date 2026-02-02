/**
 * User Creation Script
 * Run with: node create-user.js username password first_name last_name email [date_of_birth] [role]
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const bcrypt = require('bcrypt');
const db = require('./postgis');

async function createUser(username, password, first_name, last_name, email, date_of_birth, role) {
  try {
    // Validate input
    if (!username || !password || !first_name || !last_name || !email) {
      console.error('❌ Usage: node create-user.js <username> <password> <first_name> <last_name> <email> [date_of_birth] [role]');
      console.error('   Example: node create-user.js john_doe mypassword123 John Doe john@example.com 1990-01-01 user');
      process.exit(1);
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/;
    if (!usernameRegex.test(username)) {
      console.error('❌ Invalid username format');
      console.error('   Username must be 3-50 characters (letters, numbers, underscores only)');
      process.exit(1);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('❌ Invalid email format');
      process.exit(1);
    }

    // Validate password length
    if (password.length < 6) {
      console.error('❌ Password must be at least 6 characters long');
      process.exit(1);
    }

    console.log(`🔧 Creating user '${username}'...`);

    // Check if username or email already exists
    const existing = await db.query(
      'SELECT id, username, email FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existing.rows.length > 0) {
      const existingUser = existing.rows[0];
      if (existingUser.username === username) {
        console.error(`❌ Username '${username}' already exists`);
        console.error(`   Choose a different username or delete the existing user`);
        process.exit(1);
      }
      if (existingUser.email === email) {
        console.error(`❌ Email '${email}' already exists`);
        console.error(`   Choose a different email or delete the existing user`);
        process.exit(1);
      }
    }

    // Hash the password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const result = await db.query(
      `INSERT INTO users (username, password_hash, first_name, last_name, email, date_of_birth, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, username, first_name, last_name, email, date_of_birth, role, created_at`,
      [username, password_hash, first_name, last_name, email, date_of_birth || null, role || 'user']
    );

    const user = result.rows[0];

    console.log('\n✅ User created successfully!');
    console.log(`   Username: ${user.username}`);
    console.log(`   Password: ${password}`);
    console.log(`   Name: ${user.first_name} ${user.last_name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Date of Birth: ${user.date_of_birth || 'N/A'}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Created: ${user.created_at}\n`);

  } catch (error) {
    console.error('❌ Error creating user:', error.message);
  } finally {
    process.exit(0);
  }
}

// Get arguments from command line
const username = process.argv[2];
const password = process.argv[3];
const first_name = process.argv[4];
const last_name = process.argv[5];
const email = process.argv[6];
const date_of_birth = process.argv[7];
const role = process.argv[8];

createUser(username, password, first_name, last_name, email, date_of_birth, role);

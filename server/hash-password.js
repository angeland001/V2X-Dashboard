/**
 * Password Hashing Utility
 * Generates a bcrypt hash for a given password
 * Run with: node hash-password.js <password>
 */

const bcrypt = require('bcrypt');

const password = process.argv[2];

if (!password) {
  console.log('❌ Usage: node hash-password.js <password>');
  console.log('   Example: node hash-password.js mypassword123');
  process.exit(1);
}

if (password.length < 6) {
  console.log('⚠️  Warning: Password is less than 6 characters');
}

console.log('🔐 Hashing password...\n');

bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }

  console.log('✅ Hashed password:');
  console.log(hash);
  console.log('\nYou can use this hash in SQL:');
  console.log(`INSERT INTO users (username, password_hash) VALUES ('username', '${hash}');`);
  console.log('\nOr to update existing user:');
  console.log(`UPDATE users SET password_hash = '${hash}' WHERE username = 'username';`);
});

-- Migration script to add new fields to existing users table
-- Run this to update your existing users table with the new fields

-- Add new columns (using IF NOT EXISTS to be safe)
DO $$
BEGIN
    -- Add first_name column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='users' AND column_name='first_name') THEN
        ALTER TABLE users ADD COLUMN first_name VARCHAR(100);
    END IF;

    -- Add last_name column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='users' AND column_name='last_name') THEN
        ALTER TABLE users ADD COLUMN last_name VARCHAR(100);
    END IF;

    -- Add email column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='users' AND column_name='email') THEN
        ALTER TABLE users ADD COLUMN email VARCHAR(255);
    END IF;

    -- Add date_of_birth column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='users' AND column_name='date_of_birth') THEN
        ALTER TABLE users ADD COLUMN date_of_birth DATE;
    END IF;

    -- Add role column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='users' AND column_name='role') THEN
        ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user';
    END IF;
END $$;

-- Now make email unique and not null (after adding the column)
-- First, we need to set default values for existing users
UPDATE users SET
    email = username || '@example.com',
    first_name = 'User',
    last_name = username,
    role = 'user'
WHERE email IS NULL OR first_name IS NULL;

-- Now we can add the NOT NULL constraints and unique constraint
ALTER TABLE users ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE users ALTER COLUMN last_name SET NOT NULL;
ALTER TABLE users ALTER COLUMN email SET NOT NULL;

-- Add unique constraint on email
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_email_key') THEN
        ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);
    END IF;
END $$;

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Display current users
SELECT id, username, first_name, last_name, email, role, created_at FROM users;

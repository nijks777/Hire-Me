-- Add password reset fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS "passwordResetToken" TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "passwordResetExpires" TIMESTAMP;

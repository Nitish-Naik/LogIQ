-- Password Reset Database Schema
-- Run this to add password reset functionality

-- Create password_reset_tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- Add trigger to clean up old tokens (optional)
CREATE OR REPLACE FUNCTION delete_expired_reset_tokens()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM password_reset_tokens 
  WHERE expires_at < NOW() - INTERVAL '7 days';
  RETURN NULL;
END;
$$ language 'plpgsql';

-- Create trigger to run cleanup on insert
DROP TRIGGER IF EXISTS cleanup_expired_reset_tokens ON password_reset_tokens;
CREATE TRIGGER cleanup_expired_reset_tokens
  AFTER INSERT ON password_reset_tokens
  EXECUTE FUNCTION delete_expired_reset_tokens();
